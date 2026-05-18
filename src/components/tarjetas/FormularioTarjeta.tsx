import { useState } from 'react'
import { motion } from 'framer-motion'
import { tarjetasRepository } from '@/repositories'
import { useUsuarioStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Moneda, TarjetaCredito, TipoTarjeta } from '@/types'

const COLORES = ['#6366f1', '#ec4899', '#10b981', '#f97316', '#3b82f6', '#8b5cf6']
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1)

interface Props {
  tarjetaInicial?: TarjetaCredito
  onGuardado: () => void
  onCancelar: () => void
}

interface CamposFormulario {
  tipo: TipoTarjeta
  banco: string
  nombre: string
  moneda: Moneda
  color: string
  // crédito
  limite: string
  diaCierre: number
  diaPago: number
  // débito
  saldoInicial: string
}

function camposDesde(t?: TarjetaCredito): CamposFormulario {
  if (!t) return {
    tipo: 'credito', banco: '', nombre: '', moneda: 'USD', color: COLORES[0],
    limite: '', diaCierre: 1, diaPago: 1, saldoInicial: '',
  }
  return {
    tipo:         t.tipo,
    banco:        t.banco,
    nombre:       t.nombre,
    moneda:       t.moneda,
    color:        t.color,
    limite:       t.limite?.toString() ?? '',
    diaCierre:    t.diaCierre ?? 1,
    diaPago:      t.diaPago ?? 1,
    saldoInicial: t.saldoInicial?.toString() ?? '',
  }
}

export default function FormularioTarjeta({ tarjetaInicial, onGuardado, onCancelar }: Props) {
  const usuarioActivo = useUsuarioStore((s) => s.usuarioActivo)
  const modoEdicion = !!tarjetaInicial

  const [form, setForm] = useState<CamposFormulario>(() => camposDesde(tarjetaInicial))
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [errores, setErrores] = useState<Partial<Record<keyof CamposFormulario, string>>>({})

  function set<K extends keyof CamposFormulario>(campo: K, valor: CamposFormulario[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: undefined }))
  }

  const esDebito = form.tipo === 'debito'

  function validar(): boolean {
    const e: typeof errores = {}
    if (!form.banco.trim())  e.banco  = 'Requerido'
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!esDebito && form.limite && isNaN(Number(form.limite))) e.limite = 'Número inválido'
    if (esDebito && (!form.saldoInicial || isNaN(Number(form.saldoInicial)) || Number(form.saldoInicial) < 0))
      e.saldoInicial = 'Saldo inválido'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar() || !usuarioActivo) return

    setGuardando(true)
    try {
      const base = {
        banco:  form.banco.trim(),
        nombre: form.nombre.trim(),
        tipo:   form.tipo,
        moneda: form.moneda,
        color:  form.color,
        actualizadoEn: new Date().toISOString(),
      }

      const cambios: Partial<TarjetaCredito> = esDebito
        ? { ...base, saldoInicial: Number(form.saldoInicial), limite: undefined, diaCierre: undefined, diaPago: undefined }
        : { ...base, limite: form.limite ? Number(form.limite) : undefined, diaCierre: form.diaCierre, diaPago: form.diaPago, saldoInicial: undefined }

      if (modoEdicion) {
        await tarjetasRepository.actualizar(tarjetaInicial.id, cambios)
      } else {
        await tarjetasRepository.crear({
          id: crypto.randomUUID(),
          propietarioId: usuarioActivo.id,
          creadoEn: new Date().toISOString(),
          ...cambios,
        } as TarjetaCredito)
      }
      onGuardado()
    } catch (err) {
      console.error('[FormularioTarjeta] error al guardar:', err)
      setErrorGuardar('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-5"
    >
      {/* Tipo */}
      <Campo label="Tipo de tarjeta">
        <div className="flex rounded-xl overflow-hidden border border-border h-11">
          {(['credito', 'debito'] as TipoTarjeta[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('tipo', t)}
              className={cn(
                'flex-1 text-sm font-semibold transition-colors capitalize',
                form.tipo === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              {t === 'credito' ? 'Crédito' : 'Débito'}
            </button>
          ))}
        </div>
      </Campo>

      <Campo label="Banco" error={errores.banco}>
        <input
          type="text"
          placeholder="Ej. BAC, BCR, Scotiabank"
          value={form.banco}
          onChange={(e) => set('banco', e.target.value)}
          className={inputClass(!!errores.banco)}
        />
      </Campo>

      <Campo label="Nombre de la tarjeta" error={errores.nombre}>
        <input
          type="text"
          placeholder={esDebito ? 'Ej. Cuenta corriente USD' : 'Ej. Visa Gold USD'}
          value={form.nombre}
          onChange={(e) => set('nombre', e.target.value)}
          className={inputClass(!!errores.nombre)}
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        {/* Límite (crédito) o Saldo disponible (débito) */}
        {esDebito ? (
          <Campo label="Saldo disponible" error={errores.saldoInicial}>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              min={0}
              value={form.saldoInicial}
              onChange={(e) => set('saldoInicial', e.target.value)}
              className={inputClass(!!errores.saldoInicial)}
            />
          </Campo>
        ) : (
          <Campo label="Límite" error={errores.limite}>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              min={0}
              value={form.limite}
              onChange={(e) => set('limite', e.target.value)}
              className={inputClass(!!errores.limite)}
            />
          </Campo>
        )}

        <Campo label="Moneda">
          <div className="flex rounded-xl overflow-hidden border border-border h-11">
            {(['USD', 'CRC'] as Moneda[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set('moneda', m)}
                className={cn(
                  'flex-1 text-sm font-semibold transition-colors',
                  form.moneda === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </Campo>
      </div>

      {/* Días de corte/pago — solo crédito */}
      {!esDebito && (
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Día de corte">
            <select
              value={form.diaCierre}
              onChange={(e) => set('diaCierre', Number(e.target.value))}
              className={inputClass(false)}
            >
              {DIAS.map((d) => <option key={d} value={d}>Día {d}</option>)}
            </select>
          </Campo>

          <Campo label="Día de pago">
            <select
              value={form.diaPago}
              onChange={(e) => set('diaPago', Number(e.target.value))}
              className={inputClass(false)}
            >
              {DIAS.map((d) => <option key={d} value={d}>Día {d}</option>)}
            </select>
          </Campo>
        </div>
      )}

      <Campo label="Color">
        <div className="flex gap-3 pt-1">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set('color', c)}
              className={cn(
                'w-8 h-8 rounded-full transition-transform',
                form.color === c && 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-background'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </Campo>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 h-12 rounded-xl border border-border text-muted-foreground text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : modoEdicion ? 'Actualizar' : 'Guardar tarjeta'}
        </button>
      </div>
      {errorGuardar && (
        <p className="text-sm text-destructive text-center py-1">{errorGuardar}</p>
      )}
    </motion.form>
  )
}

function Campo({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function inputClass(conError: boolean) {
  return cn(
    'h-11 w-full rounded-xl bg-secondary px-3 text-sm text-foreground outline-none',
    'focus:ring-2 focus:ring-primary transition-shadow placeholder:text-muted-foreground',
    conError && 'ring-2 ring-destructive'
  )
}
