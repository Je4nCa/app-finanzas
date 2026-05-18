import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users } from 'lucide-react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { gastosFijosRepository } from '@/repositories'
import { CATEGORIAS } from '@/constants/categorias'
import { calcularPartes } from '@/services/compartido.service'
import { cn } from '@/lib/utils'
import type { CategoriaId, GastoFijo, Moneda, TarjetaCredito, Usuario } from '@/types'
import { TipoRecurrencia, TipoGastoCompartido } from '@/types'

interface Campos {
  titulo: string
  monto: string
  moneda: Moneda
  categoriaId: CategoriaId
  recurrencia: TipoRecurrencia
  tarjetaId: string
  usuarioId: string
  esCompartido: boolean
  tipoCompartido: TipoGastoCompartido.MitadMitad | TipoGastoCompartido.PorcentajePersonalizado
  porcentajeMio: number
}

const INICIAL: Campos = {
  titulo: '',
  monto: '',
  moneda: 'USD',
  categoriaId: 'comida',
  recurrencia: TipoRecurrencia.Mensual,
  tarjetaId: '',
  usuarioId: '',
  esCompartido: false,
  tipoCompartido: TipoGastoCompartido.MitadMitad,
  porcentajeMio: 50,
}

const RECURRENCIAS: { valor: TipoRecurrencia; label: string }[] = [
  { valor: TipoRecurrencia.Mensual,    label: 'Mensual' },
  { valor: TipoRecurrencia.Bimestral,  label: 'Bimestral' },
  { valor: TipoRecurrencia.Trimestral, label: 'Trimestral' },
  { valor: TipoRecurrencia.Semestral,  label: 'Semestral' },
  { valor: TipoRecurrencia.Anual,      label: 'Anual' },
]

interface Props {
  gastoFijoInicial?: GastoFijo
  onGuardado: () => void
  onCancelar: () => void
}

function camposDesde(g: GastoFijo): Campos {
  const det = g.detalleCompartido
  return {
    titulo:      g.titulo,
    monto:       String(g.monto),
    moneda:      g.moneda,
    categoriaId: g.categoriaId,
    recurrencia: g.recurrencia,
    tarjetaId:   g.tarjetaId ?? '',
    usuarioId:   g.usuarioId,
    esCompartido:   g.esCompartido,
    tipoCompartido: det?.tipo === TipoGastoCompartido.PorcentajePersonalizado
      ? TipoGastoCompartido.PorcentajePersonalizado
      : TipoGastoCompartido.MitadMitad,
    porcentajeMio: det?.porcentajeMio ?? 50,
  }
}

export default function FormularioGastoFijo({ gastoFijoInicial, onGuardado, onCancelar }: Props) {
  const tarjetas = useCollection<TarjetaCredito>(() => hCol('tarjetas'), [])
  const usuarios = useCollection<Usuario>(() => hCol('usuarios'), [])

  const [form, setForm] = useState<Campos>(() =>
    gastoFijoInicial ? camposDesde(gastoFijoInicial) : { ...INICIAL, usuarioId: '' }
  )
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})

  function set<K extends keyof Campos>(campo: K, valor: Campos[K]) {
    setForm((p) => ({ ...p, [campo]: valor }))
    setErrores((p) => ({ ...p, [campo]: undefined }))
  }

  function seleccionarTarjeta(tarjetaId: string) {
    const tarjeta = tarjetas?.find((t) => t.id === tarjetaId)
    set('tarjetaId', tarjetaId)
    if (tarjeta) set('moneda', tarjeta.moneda)
  }

  const montoNum = Number(form.monto) || 0
  const partes = form.esCompartido && montoNum > 0
    ? calcularPartes(montoNum, { tipo: form.tipoCompartido, porcentajeMio: form.porcentajeMio })
    : null

  const simbolo = form.moneda === 'USD' ? '$' : '₡'
  const usuarioPagador = usuarios?.find((u) => u.id === form.usuarioId)
  const usuarioOtro    = usuarios?.find((u) => u.id !== form.usuarioId)

  function validar(): boolean {
    const e: typeof errores = {}
    if (!form.titulo.trim())  e.titulo    = 'Requerido'
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0)
                              e.monto     = 'Monto inválido'
    if (!form.usuarioId)      e.usuarioId = 'Requerido'
    if (form.esCompartido && form.tipoCompartido === TipoGastoCompartido.PorcentajePersonalizado) {
      if (form.porcentajeMio <= 0 || form.porcentajeMio >= 100)
        e.porcentajeMio = 'Debe ser entre 1 y 99'
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return

    const detalleCompartido = form.esCompartido
      ? {
          tipo: form.tipoCompartido,
          porcentajeMio: form.tipoCompartido === TipoGastoCompartido.PorcentajePersonalizado
            ? form.porcentajeMio
            : 50,
        }
      : undefined

    setGuardando(true)
    try {
      if (gastoFijoInicial) {
        await gastosFijosRepository.actualizar(gastoFijoInicial.id, {
          titulo:           form.titulo.trim(),
          monto:            Number(form.monto),
          moneda:           form.moneda,
          categoriaId:      form.categoriaId,
          recurrencia:      form.recurrencia,
          tarjetaId:        form.tarjetaId || undefined,
          usuarioId:        form.usuarioId,
          esCompartido:     form.esCompartido,
          detalleCompartido,
          actualizadoEn:    new Date().toISOString(),
        })
      } else {
        const gasto: GastoFijo = {
          id:               crypto.randomUUID(),
          titulo:           form.titulo.trim(),
          monto:            Number(form.monto),
          moneda:           form.moneda,
          categoriaId:      form.categoriaId,
          recurrencia:      form.recurrencia,
          tarjetaId:        form.tarjetaId || undefined,
          usuarioId:        form.usuarioId,
          activo:           true,
          esCompartido:     form.esCompartido,
          detalleCompartido,
          creadoEn:         new Date().toISOString(),
          actualizadoEn:    new Date().toISOString(),
        }
        await gastosFijosRepository.crear(gasto)
      }
      onGuardado()
    } catch (err) {
      console.error('[FormularioGastoFijo] error al guardar:', err)
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
      {/* Nombre */}
      <Campo label="Nombre" error={errores.titulo}>
        <input
          type="text"
          placeholder="Ej. Netflix, Apartamento"
          value={form.titulo}
          onChange={(e) => set('titulo', e.target.value)}
          className={inputClass(!!errores.titulo)}
          autoFocus
        />
      </Campo>

      {/* Monto + Moneda */}
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Monto" error={errores.monto}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            min={0}
            step="0.01"
            value={form.monto}
            onChange={(e) => set('monto', e.target.value)}
            className={inputClass(!!errores.monto)}
          />
        </Campo>

        <Campo label="Moneda">
          <div className="flex rounded-xl overflow-hidden border border-border h-11">
            {(['USD', 'CRC'] as Moneda[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set('moneda', m)}
                className={cn(
                  'flex-1 text-sm font-semibold transition-colors',
                  form.moneda === m
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </Campo>
      </div>

      {/* Recurrencia */}
      <Campo label="Frecuencia">
        <div className="flex gap-2 flex-wrap">
          {RECURRENCIAS.map(({ valor, label }) => (
            <button
              key={valor}
              type="button"
              onClick={() => set('recurrencia', valor)}
              className={cn(
                'h-9 px-3 rounded-xl border text-xs font-medium transition-all',
                form.recurrencia === valor
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'border-border text-muted-foreground bg-secondary'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Campo>

      {/* Categoría */}
      <Campo label="Categoría">
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => set('categoriaId', cat.id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-xl border text-center transition-all',
                form.categoriaId === cat.id
                  ? 'border-transparent scale-105'
                  : 'border-border bg-secondary'
              )}
              style={
                form.categoriaId === cat.id
                  ? { backgroundColor: cat.color + '33', borderColor: cat.color }
                  : {}
              }
            >
              <span className="text-lg leading-none">{cat.emoji}</span>
              <span className="text-[10px] text-muted-foreground leading-tight truncate w-full px-1">
                {cat.nombre}
              </span>
            </button>
          ))}
        </div>
      </Campo>

      {/* Tarjeta */}
      <Campo label="Tarjeta (opcional)">
        <select
          value={form.tarjetaId}
          onChange={(e) => seleccionarTarjeta(e.target.value)}
          className={inputClass(false)}
        >
          <option value="">Sin tarjeta (efectivo)</option>
          {tarjetas?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.banco} · {t.nombre}
            </option>
          ))}
        </select>
      </Campo>

      {/* Usuario */}
      <Campo label="¿Quién paga?" error={errores.usuarioId}>
        <div className="flex gap-2">
          {usuarios?.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => set('usuarioId', u.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-all',
                form.usuarioId === u.id
                  ? 'border-transparent text-white'
                  : 'border-border text-muted-foreground bg-secondary'
              )}
              style={form.usuarioId === u.id ? { backgroundColor: u.color } : {}}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: form.usuarioId === u.id ? 'rgba(255,255,255,0.3)' : u.color }}
              >
                {u.nombre.charAt(0)}
              </span>
              {u.nombre}
            </button>
          ))}
        </div>
        {errores.usuarioId && (
          <p className="text-xs text-destructive mt-1">{errores.usuarioId}</p>
        )}
      </Campo>

      {/* ── Gasto compartido ───────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => set('esCompartido', !form.esCompartido)}
          className={cn(
            'flex items-center gap-3 h-12 px-4 rounded-xl border text-sm font-medium transition-all',
            form.esCompartido
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground bg-secondary'
          )}
        >
          <Users size={16} />
          Gasto compartido
          <div className={cn(
            'ml-auto w-10 h-5 rounded-full transition-colors relative',
            form.esCompartido ? 'bg-primary' : 'bg-border'
          )}>
            <span className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
              form.esCompartido ? 'left-5' : 'left-0.5'
            )} />
          </div>
        </button>

        <AnimatePresence>
          {form.esCompartido && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => set('tipoCompartido', TipoGastoCompartido.MitadMitad)}
                    className={cn(
                      'flex-1 h-10 rounded-xl border text-sm font-semibold transition-all',
                      form.tipoCompartido === TipoGastoCompartido.MitadMitad
                        ? 'bg-primary text-primary-foreground border-transparent'
                        : 'border-border text-muted-foreground bg-secondary'
                    )}
                  >
                    50 / 50
                  </button>
                  <button
                    type="button"
                    onClick={() => set('tipoCompartido', TipoGastoCompartido.PorcentajePersonalizado)}
                    className={cn(
                      'flex-1 h-10 rounded-xl border text-sm font-semibold transition-all',
                      form.tipoCompartido === TipoGastoCompartido.PorcentajePersonalizado
                        ? 'bg-primary text-primary-foreground border-transparent'
                        : 'border-border text-muted-foreground bg-secondary'
                    )}
                  >
                    % Personalizado
                  </button>
                </div>

                <AnimatePresence>
                  {form.tipoCompartido === TipoGastoCompartido.PorcentajePersonalizado && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                          <span>{usuarioPagador?.nombre ?? 'Quien paga'}</span>
                          <span>{usuarioOtro?.nombre ?? 'El otro'}</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={99}
                          value={form.porcentajeMio}
                          onChange={(e) => set('porcentajeMio', Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-xs font-semibold px-1">
                          <span className="text-primary">{form.porcentajeMio}%</span>
                          <span className="text-muted-foreground">{100 - form.porcentajeMio}%</span>
                        </div>
                        {errores.porcentajeMio && (
                          <p className="text-xs text-destructive">{errores.porcentajeMio}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {partes && (
                  <div className="flex gap-2">
                    <div
                      className="flex-1 rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
                      style={{ backgroundColor: (usuarioPagador?.color ?? '#6b7280') + '22' }}
                    >
                      <p className="text-[10px] text-muted-foreground truncate">
                        {usuarioPagador?.nombre ?? '—'}
                      </p>
                      <p className="text-sm font-bold" style={{ color: usuarioPagador?.color }}>
                        {simbolo}{partes.montoPagador.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center text-muted-foreground text-xs font-bold">÷</div>
                    <div
                      className="flex-1 rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
                      style={{ backgroundColor: (usuarioOtro?.color ?? '#6b7280') + '22' }}
                    >
                      <p className="text-[10px] text-muted-foreground truncate">
                        {usuarioOtro?.nombre ?? '—'}
                      </p>
                      <p className="text-sm font-bold" style={{ color: usuarioOtro?.color }}>
                        {simbolo}{partes.montoOtro.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Acciones */}
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
          {guardando ? 'Guardando…' : gastoFijoInicial ? 'Guardar cambios' : 'Agregar fijo'}
        </button>
      </div>
      {errorGuardar && (
        <p className="text-sm text-destructive text-center py-1">{errorGuardar}</p>
      )}
    </motion.form>
  )
}

function Campo({
  label, error, children,
}: {
  label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
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
