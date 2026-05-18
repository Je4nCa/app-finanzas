import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users } from 'lucide-react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { crearPlanConCuotas } from '@/repositories'
import { generarCuotas, labelMes } from '@/services/cuotas.service'
import { calcularPartes } from '@/services/compartido.service'
import { cn } from '@/lib/utils'
import type { Moneda, TarjetaCredito, Usuario } from '@/types'
import { TipoGastoCompartido } from '@/types'

const PRESETS_CUOTAS = [3, 6, 12, 18, 24]

interface Campos {
  nombreProducto: string
  montoTotal: string
  moneda: Moneda
  numeroCuotas: number
  fechaInicio: string
  tarjetaId: string
  usuarioId: string
  esCompartido: boolean
  tipoCompartido: TipoGastoCompartido.MitadMitad | TipoGastoCompartido.PorcentajePersonalizado
  porcentajeMio: number
}

function mesHoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const hoyMes = mesHoyLocal()

const INICIAL: Campos = {
  nombreProducto: '',
  montoTotal: '',
  moneda: 'USD',
  numeroCuotas: 12,
  fechaInicio: hoyMes,
  tarjetaId: '',
  usuarioId: '',
  esCompartido: false,
  tipoCompartido: TipoGastoCompartido.MitadMitad,
  porcentajeMio: 50,
}

interface Props {
  onGuardado: () => void
  onCancelar: () => void
}

export default function FormularioCuotas({ onGuardado, onCancelar }: Props) {
  const tarjetas = useCollection<TarjetaCredito>(() => hCol('tarjetas'), [])
  const usuarios = useCollection<Usuario>(() => hCol('usuarios'), [])

  const [form, setForm] = useState<Campos>({ ...INICIAL, usuarioId: '' })
  const [guardando, setGuardando] = useState(false)
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

  const montoNum   = Number(form.montoTotal) || 0
  const montoCuota = form.numeroCuotas > 0 ? montoNum / form.numeroCuotas : 0
  const simbolo    = form.moneda === 'USD' ? '$' : '₡'

  const [anioInicio, mesInicio] = form.fechaInicio
    ? form.fechaInicio.split('-').map(Number)
    : [0, 0]

  const fechaFin = (() => {
    if (!form.fechaInicio) return ''
    const totalMeses = mesInicio - 1 + form.numeroCuotas - 1
    return labelMes((totalMeses % 12) + 1, anioInicio + Math.floor(totalMeses / 12))
  })()

  const partes = form.esCompartido && montoNum > 0
    ? calcularPartes(montoCuota, { tipo: form.tipoCompartido, porcentajeMio: form.porcentajeMio })
    : null

  const usuarioPagador = usuarios?.find((u) => u.id === form.usuarioId)
  const usuarioOtro    = usuarios?.find((u) => u.id !== form.usuarioId)

  function validar(): boolean {
    const e: typeof errores = {}
    if (!form.nombreProducto.trim()) e.nombreProducto = 'Requerido'
    if (!form.montoTotal || isNaN(montoNum) || montoNum <= 0) e.montoTotal = 'Monto inválido'
    if (!form.tarjetaId)   e.tarjetaId   = 'Requerido'
    if (!form.usuarioId)   e.usuarioId   = 'Requerido'
    if (!form.fechaInicio) e.fechaInicio = 'Requerido'
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
      const totalMeses = mesInicio - 1 + form.numeroCuotas - 1
      const plan = {
        id:              crypto.randomUUID(),
        nombreProducto:  form.nombreProducto.trim(),
        montoTotal:      montoNum,
        numeroCuotas:    form.numeroCuotas,
        montoCuota:      Number(montoCuota.toFixed(2)),
        fechaInicio:     `${form.fechaInicio}-01`,
        fechaFin:        `${anioInicio + Math.floor(totalMeses / 12)}-${String((totalMeses % 12) + 1).padStart(2, '0')}-01`,
        tarjetaId:       form.tarjetaId,
        usuarioId:       form.usuarioId,
        moneda:          form.moneda,
        esCompartido:    form.esCompartido,
        detalleCompartido,
        creadoEn:        new Date().toISOString(),
      }

      const cuotas = generarCuotas(plan)
      await crearPlanConCuotas(plan, cuotas)
      onGuardado()
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
      <Campo label="Producto / descripción" error={errores.nombreProducto}>
        <input
          type="text"
          placeholder="Ej. iPhone 15, Lavadora LG"
          value={form.nombreProducto}
          onChange={(e) => set('nombreProducto', e.target.value)}
          className={inputClass(!!errores.nombreProducto)}
          autoFocus
        />
      </Campo>

      {/* Monto + Moneda */}
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Monto total" error={errores.montoTotal}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            min={0}
            step="0.01"
            value={form.montoTotal}
            onChange={(e) => set('montoTotal', e.target.value)}
            className={inputClass(!!errores.montoTotal)}
          />
        </Campo>
        <Campo label="Moneda">
          <div className="flex rounded-xl overflow-hidden border border-border h-11">
            {(['USD', 'CRC'] as Moneda[]).map((m) => (
              <button key={m} type="button" onClick={() => set('moneda', m)}
                className={cn('flex-1 text-sm font-semibold transition-colors',
                  form.moneda === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                {m}
              </button>
            ))}
          </div>
        </Campo>
      </div>

      {/* Número de cuotas */}
      <Campo label="Número de cuotas">
        <div className="flex gap-2">
          {PRESETS_CUOTAS.map((n) => (
            <button key={n} type="button" onClick={() => set('numeroCuotas', n)}
              className={cn('flex-1 h-11 rounded-xl border text-sm font-semibold transition-all',
                form.numeroCuotas === n
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'border-border text-muted-foreground bg-secondary')}>
              {n}
            </button>
          ))}
        </div>
      </Campo>

      {/* Mes de inicio */}
      <Campo label="Primer mes de cobro" error={errores.fechaInicio}>
        <input type="month" value={form.fechaInicio}
          onChange={(e) => set('fechaInicio', e.target.value)}
          className={inputClass(!!errores.fechaInicio)} />
      </Campo>

      {/* Tarjeta */}
      <Campo label="Tarjeta" error={errores.tarjetaId}>
        <select value={form.tarjetaId} onChange={(e) => seleccionarTarjeta(e.target.value)}
          className={inputClass(!!errores.tarjetaId)}>
          <option value="">Seleccionar tarjeta</option>
          {tarjetas?.map((t) => (
            <option key={t.id} value={t.id}>{t.banco} · {t.nombre}</option>
          ))}
        </select>
      </Campo>

      {/* Usuario */}
      <Campo label="¿Quién lo financia?" error={errores.usuarioId}>
        <div className="flex gap-2">
          {usuarios?.map((u) => (
            <button key={u.id} type="button" onClick={() => set('usuarioId', u.id)}
              className={cn('flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-all',
                form.usuarioId === u.id ? 'border-transparent text-white' : 'border-border text-muted-foreground bg-secondary')}
              style={form.usuarioId === u.id ? { backgroundColor: u.color } : {}}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: form.usuarioId === u.id ? 'rgba(255,255,255,0.3)' : u.color }}>
                {u.nombre.charAt(0)}
              </span>
              {u.nombre}
            </button>
          ))}
        </div>
        {errores.usuarioId && <p className="text-xs text-destructive mt-1">{errores.usuarioId}</p>}
      </Campo>

      {/* Compartido */}
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => set('esCompartido', !form.esCompartido)}
          className={cn('flex items-center gap-3 h-12 px-4 rounded-xl border text-sm font-medium transition-all',
            form.esCompartido
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground bg-secondary')}>
          <Users size={16} />
          Cuota compartida
          <div className={cn('ml-auto w-10 h-5 rounded-full transition-colors relative', form.esCompartido ? 'bg-primary' : 'bg-border')}>
            <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', form.esCompartido ? 'left-5' : 'left-0.5')} />
          </div>
        </button>

        <AnimatePresence>
          {form.esCompartido && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex gap-2">
                  {([
                    [TipoGastoCompartido.MitadMitad, '50 / 50'],
                    [TipoGastoCompartido.PorcentajePersonalizado, '% Personalizado'],
                  ] as const).map(([tipo, label]) => (
                    <button key={tipo} type="button" onClick={() => set('tipoCompartido', tipo)}
                      className={cn('flex-1 h-10 rounded-xl border text-sm font-semibold transition-all',
                        form.tipoCompartido === tipo
                          ? 'bg-primary text-primary-foreground border-transparent'
                          : 'border-border text-muted-foreground bg-secondary')}>
                      {label}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {form.tipoCompartido === TipoGastoCompartido.PorcentajePersonalizado && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                          <span>{usuarioPagador?.nombre ?? 'Quien financia'}</span>
                          <span>{usuarioOtro?.nombre ?? 'El otro'}</span>
                        </div>
                        <input type="range" min={1} max={99} value={form.porcentajeMio}
                          onChange={(e) => set('porcentajeMio', Number(e.target.value))}
                          className="w-full accent-primary" />
                        <div className="flex justify-between text-xs font-semibold px-1">
                          <span className="text-primary">{form.porcentajeMio}%</span>
                          <span className="text-muted-foreground">{100 - form.porcentajeMio}%</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Preview cuota por usuario */}
                {partes && form.usuarioId && (
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
                      style={{ backgroundColor: (usuarioPagador?.color ?? '#6b7280') + '22' }}>
                      <p className="text-[10px] text-muted-foreground truncate">{usuarioPagador?.nombre ?? '—'} / mes</p>
                      <p className="text-sm font-bold" style={{ color: usuarioPagador?.color }}>
                        {simbolo}{partes.montoPagador.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center text-muted-foreground text-xs font-bold">÷</div>
                    <div className="flex-1 rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
                      style={{ backgroundColor: (usuarioOtro?.color ?? '#6b7280') + '22' }}>
                      <p className="text-[10px] text-muted-foreground truncate">{usuarioOtro?.nombre ?? '—'} / mes</p>
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

      {/* Preview resumen */}
      {montoNum > 0 && form.fechaInicio && (
        <div className="rounded-2xl bg-secondary border border-border px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Resumen</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{form.numeroCuotas} cuotas de</span>
            <span className="font-bold text-primary">
              {simbolo}{montoCuota.toLocaleString(undefined, { maximumFractionDigits: 2 })} / mes
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{labelMes(mesInicio, anioInicio)}</span>
            <span>→</span>
            <span>{fechaFin}</span>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancelar}
          className="flex-1 h-12 rounded-xl border border-border text-muted-foreground text-sm font-medium">
          Cancelar
        </button>
        <button type="submit" disabled={guardando}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
          {guardando ? 'Creando…' : 'Crear plan'}
        </button>
      </div>
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
