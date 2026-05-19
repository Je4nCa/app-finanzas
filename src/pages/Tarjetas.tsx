import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CreditCard, Check, X } from 'lucide-react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { tarjetasRepository, abonosTarjetaRepository, montosManualesRepository } from '@/repositories'
import { useMonedaStore, useUsuarioStore } from '@/store'
import { periodoFacturacion } from '@/lib/billingCycle'
import { cn } from '@/lib/utils'
import { nanoid } from 'nanoid'
import PageWrapper from '@components/ui/PageWrapper'
import FormularioTarjeta from '@components/tarjetas/FormularioTarjeta'
import type { TarjetaCredito, Gasto, GastoFijo, CuotaMensual, PlanCuotas, AbonoTarjeta, MontoManualTarjeta, Moneda, Usuario } from '@/types'

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtFecha(iso: string): string {
  const [, mm, dd] = iso.split('-')
  return `${parseInt(dd)} ${MESES_CORTO[parseInt(mm) - 1]}`
}

type PanelActivo =
  | { tipo: 'ninguno' }
  | { tipo: 'nueva' }
  | { tipo: 'editar'; tarjeta: TarjetaCredito }

// ─── Debit card balance component ────────────────────────────────────────────

function SaldoDebito({ tarjeta, gastos }: { tarjeta: TarjetaCredito; gastos: Gasto[] }) {
  const tipoCambio = useMonedaStore((s) => s.tipoCambio)

  const gastado = useMemo(() =>
    gastos
      .filter((g) => g.tarjetaId === tarjeta.id)
      .reduce((sum, g) => {
        const monto = g.moneda === tarjeta.moneda
          ? g.monto
          : g.moneda === 'USD'
            ? g.monto * (g.tipoCambioAlMomento ?? tipoCambio)
            : g.monto / (g.tipoCambioAlMomento ?? tipoCambio)
        return sum + monto
      }, 0),
    [gastos, tarjeta, tipoCambio]
  )

  const saldoActual = (tarjeta.saldoInicial ?? 0) - gastado
  const simbolo     = tarjeta.moneda === 'USD' ? '$' : '₡'

  return (
    <div className="text-right shrink-0">
      <p className={cn('text-sm font-semibold tabular-nums', saldoActual < 0 && 'text-destructive')}>
        {simbolo}{saldoActual.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
      <p className="text-[10px] text-muted-foreground">disponible</p>
    </div>
  )
}

// ─── Abono mini-form ──────────────────────────────────────────────────────────

interface FormAbonoProps {
  tarjeta: TarjetaCredito
  periodo: { anio: number; mes: number }
  usuarios: Usuario[]
  usuarioActivoId?: string
  onGuardado: () => void
  onCancelar: () => void
}

function FormAbono({ tarjeta, periodo, usuarios, usuarioActivoId, onGuardado, onCancelar }: FormAbonoProps) {
  const hoy = new Date().toISOString().slice(0, 10)
  const defaultUserId = usuarioActivoId ?? usuarios[0]?.id ?? ''
  const [selectedUserId, setSelectedUserId] = useState(defaultUserId)
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoy)
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const montoNum = parseFloat(monto.replace(/,/g, ''))
    if (!montoNum || montoNum <= 0) { setError('Ingresa un monto válido'); return }
    if (!fecha) { setError('Selecciona una fecha'); return }
    if (!selectedUserId) { setError('Seleccioná quién realizó el pago'); return }

    setGuardando(true)
    setError(null)
    try {
      const abono: AbonoTarjeta = {
        id: nanoid(),
        tarjetaId: tarjeta.id,
        usuarioId: selectedUserId,
        anio: periodo.anio,
        mes: periodo.mes,
        monto: montoNum,
        moneda: tarjeta.moneda as Moneda,
        fecha,
        ...(notas.trim() ? { notas: notas.trim() } : {}),
        creadoEn: new Date().toISOString(),
      }
      await abonosTarjetaRepository.crear(abono)
      onGuardado()
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const simbolo = tarjeta.moneda === 'USD' ? '$' : '₡'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-3 border-t border-border mt-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Registrar abono</p>

      {/* ¿Quién pagó? */}
      <div>
        <label className="text-xs text-muted-foreground">¿Quién realizó el pago?</label>
        <div className="flex gap-2 mt-1">
          {usuarios.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelectedUserId(u.id)}
              className={cn(
                'flex-1 h-9 flex items-center justify-center gap-2 rounded-lg border text-xs font-medium transition-colors',
                selectedUserId === u.id
                  ? 'border-transparent text-white'
                  : 'border-border text-muted-foreground bg-secondary hover:bg-secondary/80'
              )}
              style={selectedUserId === u.id ? { backgroundColor: u.color } : {}}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: selectedUserId === u.id ? 'rgba(255,255,255,0.4)' : u.color }}
              />
              {u.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Monto ({simbolo})</label>
          <input
            type="number"
            step="any"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
            className="w-full mt-1 h-9 px-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Fecha de pago</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full mt-1 h-9 px-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Notas (opcional)</label>
        <input
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Pago mínimo, pago total..."
          className="w-full mt-1 h-9 px-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancelar}
          className="h-8 px-3 rounded-lg text-xs text-muted-foreground border border-border"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="h-8 px-4 rounded-lg text-xs bg-primary text-primary-foreground font-semibold disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar abono'}
        </button>
      </div>
    </form>
  )
}

// ─── Credit card billing summary ─────────────────────────────────────────────

interface ResumenCreditoProps {
  tarjeta: TarjetaCredito
  periodo: { anio: number; mes: number }
  gastos: Gasto[]
  gastosFijos: GastoFijo[]
  planesCuotas: PlanCuotas[]
  cuotasMensuales: CuotaMensual[]
  abonos: AbonoTarjeta[]
  montoManual?: MontoManualTarjeta
  usuarios: Usuario[]
  usuarioActivoId?: string
  tipoCambio: number
}

function ResumenCredito({
  tarjeta,
  periodo,
  gastos,
  gastosFijos,
  planesCuotas,
  cuotasMensuales,
  abonos,
  montoManual,
  usuarios,
  usuarioActivoId,
  tipoCambio,
}: ResumenCreditoProps) {
  const [mostrarFormAbono, setMostrarFormAbono] = useState(false)
  const [eliminandoAbonoId, setEliminandoAbonoId] = useState<string | null>(null)
  const [editandoManual, setEditandoManual] = useState(false)
  const [inputManual, setInputManual] = useState('')
  const [guardandoManual, setGuardandoManual] = useState(false)

  const { desde, hasta } = periodoFacturacion(periodo.anio, periodo.mes, tarjeta.diaCierre ?? 1)
  const simbolo = tarjeta.moneda === 'USD' ? '$' : '₡'

  function conv(monto: number, monedaOrigen: string): number {
    if (monedaOrigen === tarjeta.moneda) return monto
    if (monedaOrigen === 'USD') return monto * tipoCambio
    return monto / tipoCambio
  }

  const { subtotalVar, subtotalFijos, subtotalCuotas, totalFacturado, totalAbonos, totalBase, saldoPendiente } = useMemo(() => {
    const subtotalVar = gastos
      .filter((g) => g.tarjetaId === tarjeta.id && g.fecha >= desde && g.fecha <= hasta)
      .reduce((sum, g) => sum + conv(g.monto, g.moneda), 0)

    const subtotalFijos = gastosFijos
      .filter((g) => g.tarjetaId === tarjeta.id && g.activo)
      .reduce((sum, g) => sum + conv(g.monto, g.moneda), 0)

    const planIds = new Set(
      planesCuotas.filter((p) => p.tarjetaId === tarjeta.id).map((p) => p.id)
    )
    const subtotalCuotas = cuotasMensuales
      .filter((c) => planIds.has(c.planCuotasId) && c.anio === periodo.anio && c.mes === periodo.mes)
      .reduce((sum, c) => {
        const plan = planesCuotas.find((p) => p.id === c.planCuotasId)
        return sum + conv(c.monto, plan?.moneda ?? tarjeta.moneda)
      }, 0)

    const totalFacturado = subtotalVar + subtotalFijos + subtotalCuotas

    const totalAbonos = abonos
      .filter((a) => a.tarjetaId === tarjeta.id && a.anio === periodo.anio && a.mes === periodo.mes)
      .reduce((sum, a) => sum + conv(a.monto, a.moneda), 0)

    const totalBase = montoManual ? montoManual.monto : totalFacturado

    return {
      subtotalVar,
      subtotalFijos,
      subtotalCuotas,
      totalFacturado,
      totalAbonos,
      totalBase,
      saldoPendiente: totalBase - totalAbonos,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, gastosFijos, planesCuotas, cuotasMensuales, abonos, montoManual, tarjeta.id, desde, hasta, periodo.anio, periodo.mes, tipoCambio])

  const porcentaje = tarjeta.limite ? Math.min((saldoPendiente / tarjeta.limite) * 100, 100) : null

  const abonosPeriodo = abonos.filter(
    (a) => a.tarjetaId === tarjeta.id && a.anio === periodo.anio && a.mes === periodo.mes
  )

  async function guardarManual() {
    const monto = parseFloat(inputManual.replace(/,/g, ''))
    if (!monto || monto <= 0) return
    setGuardandoManual(true)
    try {
      const id = montosManualesRepository.idPara(tarjeta.id, periodo.anio, periodo.mes)
      await montosManualesRepository.crear({
        id,
        tarjetaId: tarjeta.id,
        anio: periodo.anio,
        mes: periodo.mes,
        monto,
        creadoEn: new Date().toISOString(),
      })
      setEditandoManual(false)
    } finally {
      setGuardandoManual(false)
    }
  }

  async function limpiarManual() {
    if (!montoManual) return
    await montosManualesRepository.eliminar(montoManual.id)
  }

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {/* Billing period header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Período: {fmtFecha(desde)} – {fmtFecha(hasta)}</span>
        {tarjeta.diaPago && (
          <span>Pago el día {tarjeta.diaPago}</span>
        )}
      </div>

      {/* Saldo pendiente prominent */}
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Saldo pendiente</span>
        <span className={cn('text-xl font-bold tabular-nums', saldoPendiente <= 0 && totalBase > 0 && 'text-green-500')}>
          {simbolo}{saldoPendiente.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Progress bar vs limit */}
      {porcentaje !== null && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', porcentaje > 80 ? 'bg-destructive' : 'bg-primary')}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{porcentaje.toFixed(0)}% del límite</span>
            <span>{simbolo}{tarjeta.limite!.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Total a pagar (manual override o calculado) */}
      <div className="flex flex-col gap-1 pt-0.5">
        {/* Subtotales calculados — siempre visibles como referencia */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Variables</span>
          <span className="tabular-nums">{simbolo}{subtotalVar.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Fijos</span>
          <span className="tabular-nums">{simbolo}{subtotalFijos.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Cuotas</span>
          <span className="tabular-nums">{simbolo}{subtotalCuotas.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>

        {/* Total a pagar: manual (editable) o calculado */}
        <div className="flex items-center justify-between border-t border-border pt-1 mt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Total a pagar</span>
            {montoManual && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">manual</span>
            )}
          </div>
          {editandoManual ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="any"
                min="0"
                value={inputManual}
                onChange={(e) => setInputManual(e.target.value)}
                placeholder={totalFacturado.toFixed(0)}
                autoFocus
                className="w-28 h-7 px-2 rounded-lg bg-secondary border border-border text-sm tabular-nums text-right focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={guardarManual}
                disabled={guardandoManual}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => setEditandoManual(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium tabular-nums">
                {simbolo}{(montoManual ? montoManual.monto : totalFacturado).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              {montoManual ? (
                <button
                  onClick={limpiarManual}
                  className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors text-xs"
                  title="Volver al calculado"
                >×</button>
              ) : (
                <button
                  onClick={() => { setInputManual(totalFacturado.toFixed(0)); setEditandoManual(true) }}
                  className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Ingresar monto manual"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Abonos section */}
      {(abonosPeriodo.length > 0 || totalAbonos > 0) && (
        <div className="flex flex-col gap-1 pt-1 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Abonos registrados</p>
          {abonosPeriodo.map((abono) => {
            const pagador = abono.usuarioId ? usuarios.find((u) => u.id === abono.usuarioId) : null
            return (
            <div key={abono.id}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    -{simbolo}{conv(abono.monto, abono.moneda).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  {pagador && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full text-white leading-none shrink-0"
                      style={{ backgroundColor: pagador.color }}
                    >
                      {pagador.nombre}
                    </span>
                  )}
                  {abono.notas && <span className="text-muted-foreground truncate max-w-[80px]">{abono.notas}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">{fmtFecha(abono.fecha)}</span>
                  <button
                    onClick={() => setEliminandoAbonoId(eliminandoAbonoId === abono.id ? null : abono.id)}
                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors text-[10px]"
                  >
                    ×
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {eliminandoAbonoId === abono.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-destructive/10 mt-1">
                      <p className="text-xs text-destructive">¿Eliminar abono?</p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setEliminandoAbonoId(null)}
                          className="h-6 px-2 rounded text-[10px] text-muted-foreground border border-border"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={async () => {
                            await abonosTarjetaRepository.eliminar(abono.id)
                            setEliminandoAbonoId(null)
                          }}
                          className="h-6 px-2 rounded text-[10px] bg-destructive text-white font-semibold"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )})}
        </div>
      )}

      {/* Register abono button / form */}
      {!mostrarFormAbono ? (
        <button
          onClick={() => setMostrarFormAbono(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5 self-start"
        >
          <CreditCard size={12} />
          Registrar abono
        </button>
      ) : (
        <FormAbono
          tarjeta={tarjeta}
          periodo={periodo}
          usuarios={usuarios}
          usuarioActivoId={usuarioActivoId}
          onGuardado={() => setMostrarFormAbono(false)}
          onCancelar={() => setMostrarFormAbono(false)}
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Tarjetas() {
  const tipoCambio = useMonedaStore((s) => s.tipoCambio)
  const usuarioActivo = useUsuarioStore((s) => s.usuarioActivo)

  const ahora = new Date()
  const [periodo, setPeriodo] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() + 1 })

  function navMes(delta: number) {
    setPeriodo((p) => {
      let nuevoMes = p.mes + delta
      let nuevoAnio = p.anio
      if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio-- }
      if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++ }
      return { anio: nuevoAnio, mes: nuevoMes }
    })
  }

  const tarjetas         = useCollection<TarjetaCredito>(() => hCol('tarjetas'), [])
  const gastos           = useCollection<Gasto>(() => hCol('gastos'), [])
  const gastosFijos      = useCollection<GastoFijo>(() => hCol('gastosFijos'), [])
  const planesCuotas     = useCollection<PlanCuotas>(() => hCol('planesCuotas'), [])
  const cuotasMensuales  = useCollection<CuotaMensual>(() => hCol('cuotasMensuales'), [])
  const abonosTarjeta      = useCollection<AbonoTarjeta>(() => hCol('abonosTarjeta'), [])
  const montosManuales     = useCollection<MontoManualTarjeta>(() => hCol('montosManualesTarjeta'), [])
  const usuarios           = useCollection<Usuario>(() => hCol('usuarios'), [])

  const [panel, setPanel] = useState<PanelActivo>({ tipo: 'ninguno' })
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const mostrarFormulario = panel.tipo === 'nueva' || panel.tipo === 'editar'

  function cerrarPanel() { setPanel({ tipo: 'ninguno' }) }

  async function handleEliminar(id: string) {
    await tarjetasRepository.eliminar(id)
    setEliminandoId(null)
  }

  return (
    <PageWrapper className="px-4 py-6 flex flex-col gap-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarjetas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {tarjetas?.length
              ? `${tarjetas.length} tarjeta${tarjetas.length !== 1 ? 's' : ''}`
              : 'Sin tarjetas aún'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navMes(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[70px] text-center">
            {MESES_CORTO[periodo.mes - 1]} {periodo.anio}
          </span>
          <button
            onClick={() => navMes(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          {!mostrarFormulario && (
            <button
              onClick={() => setPanel({ tipo: 'nueva' })}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold ml-1"
            >
              <Plus size={16} />
              Nueva
            </button>
          )}
        </div>
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {mostrarFormulario && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-base font-semibold mb-4">
                {panel.tipo === 'editar' ? 'Editar tarjeta' : 'Nueva tarjeta'}
              </h2>
              <FormularioTarjeta
                tarjetaInicial={panel.tipo === 'editar' ? panel.tarjeta : undefined}
                onGuardado={cerrarPanel}
                onCancelar={cerrarPanel}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estado vacío */}
      {tarjetas?.length === 0 && !mostrarFormulario && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-4xl">💳</span>
          <p className="text-muted-foreground text-sm">Agrega tu primera tarjeta para empezar</p>
        </div>
      )}

      {/* Lista */}
      {tarjetas && tarjetas.length > 0 && (
        <div className="flex flex-col gap-3">
          {tarjetas.map((tarjeta) => (
            <div key={tarjeta.id}>
              <div className="p-4 rounded-2xl bg-card border border-border">
                {/* Card header row */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: tarjeta.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{tarjeta.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {tarjeta.banco} · {tarjeta.moneda} ·{' '}
                      <span className="capitalize">{tarjeta.tipo}</span>
                    </p>
                  </div>

                  {tarjeta.tipo === 'debito' && (
                    <SaldoDebito tarjeta={tarjeta} gastos={gastos ?? []} />
                  )}

                  <div className="flex gap-1 ml-1">
                    <button
                      onClick={() => setPanel({ tipo: 'editar', tarjeta })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setEliminandoId(eliminandoId === tarjeta.id ? null : tarjeta.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Expanded billing summary for credit cards */}
                {tarjeta.tipo === 'credito' && tarjeta.diaCierre && (
                  <ResumenCredito
                    tarjeta={tarjeta}
                    periodo={periodo}
                    gastos={gastos ?? []}
                    gastosFijos={gastosFijos ?? []}
                    planesCuotas={planesCuotas ?? []}
                    cuotasMensuales={cuotasMensuales ?? []}
                    abonos={abonosTarjeta ?? []}
                    montoManual={montosManuales?.find(
                      (m) => m.tarjetaId === tarjeta.id && m.anio === periodo.anio && m.mes === periodo.mes
                    )}
                    usuarios={usuarios ?? []}
                    usuarioActivoId={usuarioActivo?.id}
                    tipoCambio={tipoCambio}
                  />
                )}
              </div>

              <AnimatePresence>
                {eliminandoId === tarjeta.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 mx-1 rounded-b-xl bg-destructive/10 border border-t-0 border-destructive/20">
                      <p className="text-sm text-destructive font-medium">¿Eliminar {tarjeta.nombre}?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setEliminandoId(null)} className="h-8 px-3 rounded-lg text-xs text-muted-foreground border border-border">Cancelar</button>
                        <button onClick={() => handleEliminar(tarjeta.id)} className="h-8 px-3 rounded-lg text-xs bg-destructive text-white font-semibold">Eliminar</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

    </PageWrapper>
  )
}
