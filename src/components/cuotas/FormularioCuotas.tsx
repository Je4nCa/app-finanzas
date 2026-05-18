import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users } from 'lucide-react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { crearPlanConCuotas } from '@/repositories'
import { generarCuotas, labelMes } from '@/services/cuotas.service'
import { calcularPartes } from '@/services/compartido.service'
import { mesDePago } from '@/lib/billingCycle'
import { cn } from '@/lib/utils'
import type { Moneda, TarjetaCredito, Usuario } from '@/types'
import { TipoGastoCompartido } from '@/types'

const PRESETS_CUOTAS = [3, 6, 12, 18, 24]

function pad(n: number) { return String(n).padStart(2, '0') }

interface Campos {
  nombreProducto: string
  montoTotal: string
  moneda: Moneda
  numeroCuotas: number
  fechaCompra: string
  tarjetaId: string
  usuarioId: string
  esCompartido: boolean
  tipoCompartido: TipoGastoCompartido.MitadMitad | TipoGastoCompartido.PorcentajePersonalizado
  porcentajeMio: number
}

function fechaHoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const hoyFecha = fechaHoyLocal()

const INICIAL: Campos = {
  nombreProducto: '',
  montoTotal: '',
  moneda: 'USD',
  numeroCuotas: 12,
  fechaCompra: hoyFecha,
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

  const montoNum   = Number(form.montoTotal) || 0
  const montoCuota = form.numeroCuotas > 0 ? montoNum / form.numeroCuotas : 0
  const simbolo    = form.moneda === 'USD' ? '$' : '₡'

  // Compute primerMes from fechaCompra + tarjeta.diaCierre
  const tarjetaSeleccionada = tarjetas?.find((t) => t.id === form.tarjetaId)
  const primerMes = (() => {
    if (!form.tarjetaId || !form.fechaCompra || !tarjetaSeleccionada?.diaCierre) return null
    return mesDePago(form.fechaCompra, tarjetaSeleccionada.diaCierre)
  })()

  // Derive fechaInicio from primerMes
  const fechaInicioDerivada = primerMes
    ? `${primerMes.anio}-${pad(primerMes.mes)}-01`
    : null

  // Determine if primer cobro shifted to next month
  const primerMesDespazado = (() => {
    if (!primerMes || !form.fechaCompra) return false
    const [, mmStr] = form.fechaCompra.split('-')
    return parseInt(mmStr) !== primerMes.mes
  })()

  const fechaFin = (() => {
    if (!primerMes) return ''
    const totalMeses = primerMes.mes - 1 + form.numeroCuotas - 1
    return labelMes((totalMeses % 12) + 1, primerMes.anio + Math.floor(totalMeses / 12))
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
    if (!form.fechaCompra) e.fechaCompra = 'Requerido'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validar()) return
    if (!primerMes || !fechaInicioDerivada) return

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
      const totalMeses = primerMes.mes - 1 + form.numeroCuotas - 1
      const plan = {
        id:              crypto.randomUUID(),
        nombreProducto:  form.nombreProducto.trim(),
        montoTotal:      montoNum,
        numeroCuotas:    form.numeroCuotas,
        montoCuota:      Number(montoCuota.toFixed(2)),
        fechaInicio:     fechaInicioDerivada,
        fechaFin:        `${primerMes.anio + Math.floor(totalMeses / 12)}-${pad((totalMeses % 12) + 1)}-01`,
        tarjetaId:       form.tarjetaId,
        fechaCompra:     form.fechaCompra,
        usuarioId:       form.usuarioId,
        moneda:          form.moneda,
        esCompartido:    form.esCompartido,
        detalleCompartido,
        creadoEn:        new Date().toISOString(),
      }

      const cuotas = generarCuotas(plan)
      await crearPlanConCuotas(plan, cuotas)
      onGuardado()
    } catch (err) {
      console.error('[FormularioCuotas] error al guardar:', err)
      setErrorGuardar('No se pudo crear el plan. Intentá de nuevo.')
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

      {/* Tarjeta — shown before fechaCompra so diaCierre is known */}
      <Campo label="Tarjeta" error={errores.tarjetaId}>
        <select value={form.tarjetaId} onChange={(e) => seleccionarTarjeta(e.target.value)}
          className={inputClass(!!errores.tarjetaId)}>
          <option value="">Seleccionar tarjeta</option>
          {tarjetas?.map((t) => (
            <option key={t.id} value={t.id}>{t.banco} · {t.nombre}</option>
          ))}
        </select>
      </Campo>

      {/* Fecha de compra */}
      <Campo label="Fecha de compra / procesamiento" error={errores.fechaCompra}>
        <input
          type="date"
          value={form.fechaCompra}
          onChange={(e) => set('fechaCompra', e.target.value)}
          className={inputClass(!!errores.fechaCompra)}
        />
      </Campo>

      {/* Primer cobro computed result */}
      {form.tarjetaId && form.fechaCompra && primerMes && (
        <div className={cn(
          'flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed',
          primerMesDespazado
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        )}>
          <span>Primer cobro:</span>
          <span className="font-bold">{labelMes(primerMes.mes, primerMes.anio)}</span>
          {primerMesDespazado && (
            <span className="text-amber-400/70 ml-auto">Pasó el corte → siguiente mes</span>
          )}
        </div>
      )}

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
      {montoNum > 0 && primerMes && (
        <div className="rounded-2xl bg-secondary border border-border px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Resumen</p>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{form.numeroCuotas} cuotas de</span>
            <span className="font-bold text-primary">
              {simbolo}{montoCuota.toLocaleString(undefined, { maximumFractionDigits: 2 })} / mes
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{labelMes(primerMes.mes, primerMes.anio)}</span>
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
