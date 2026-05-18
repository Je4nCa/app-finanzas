import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronDown, Trash2, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { cuotasMensualesRepository } from '@/repositories'
import { eliminarPlanConCuotas, estadoEfectivo, labelMes } from '@/services/cuotas.service'
import { EstadoCuota } from '@/types'
import { cn } from '@/lib/utils'
import PageWrapper from '@components/ui/PageWrapper'
import FormularioCuotas from '@components/cuotas/FormularioCuotas'
import type { PlanCuotas, CuotaMensual, TarjetaCredito } from '@/types'

export default function TasaCero() {
  const [mostrarForm, setMostrarForm]         = useState(false)
  const [expandidoId, setExpandidoId]         = useState<string | null>(null)
  const [eliminandoId, setEliminandoId]       = useState<string | null>(null)

  const planes   = useCollection<PlanCuotas>(() => hCol('planesCuotas'), [])
  const tarjetas = useCollection<TarjetaCredito>(() => hCol('tarjetas'), [])

  const tarjetaMap = Object.fromEntries((tarjetas ?? []).map((t) => [t.id, t])) as Record<string, TarjetaCredito>

  async function handleEliminar(planId: string) {
    await eliminarPlanConCuotas(planId)
    setEliminandoId(null)
    if (expandidoId === planId) setExpandidoId(null)
  }

  return (
    <PageWrapper className="px-4 py-6 flex flex-col gap-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasa Cero</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {planes?.length
              ? `${planes.length} plan${planes.length !== 1 ? 'es' : ''} activo${planes.length !== 1 ? 's' : ''}`
              : 'Sin planes aún'}
          </p>
        </div>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Plus size={16} />
            Nuevo
          </button>
        )}
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {mostrarForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-base font-semibold mb-4">Nuevo plan de cuotas</h2>
              <FormularioCuotas
                onGuardado={() => setMostrarForm(false)}
                onCancelar={() => setMostrarForm(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estado vacío */}
      {!mostrarForm && planes?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="text-4xl">💳</span>
          <p className="text-muted-foreground text-sm">Sin financiamientos activos</p>
        </div>
      )}

      {/* Lista de planes */}
      {planes && planes.length > 0 && (
        <div className="flex flex-col gap-3">
          {planes.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              tarjeta={tarjetaMap[plan.tarjetaId]}
              expandido={expandidoId === plan.id}
              eliminando={eliminandoId === plan.id}
              onToggleExpand={() => setExpandidoId(expandidoId === plan.id ? null : plan.id)}
              onEliminar={() => setEliminandoId(eliminandoId === plan.id ? null : plan.id)}
              onConfirmarEliminar={() => handleEliminar(plan.id)}
              onCancelarEliminar={() => setEliminandoId(null)}
            />
          ))}
        </div>
      )}

    </PageWrapper>
  )
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: PlanCuotas
  tarjeta?: TarjetaCredito
  expandido: boolean
  eliminando: boolean
  onToggleExpand: () => void
  onEliminar: () => void
  onConfirmarEliminar: () => void
  onCancelarEliminar: () => void
}

function PlanCard({
  plan, tarjeta,
  expandido, eliminando,
  onToggleExpand, onEliminar, onConfirmarEliminar, onCancelarEliminar,
}: PlanCardProps) {
  const todasCuotas = useCollection<CuotaMensual>(() => hCol('cuotasMensuales'), [])
  const cuotas = useMemo(
    () =>
      todasCuotas
        ?.filter((c) => c.planCuotasId === plan.id)
        .sort((a, b) => a.numeroCuota - b.numeroCuota),
    [todasCuotas, plan.id]
  )

  const pagadas  = cuotas?.filter((c) => c.estado === EstadoCuota.Pagada).length ?? 0
  const total    = plan.numeroCuotas
  const progreso = total > 0 ? (pagadas / total) * 100 : 0
  const simbolo  = plan.moneda === 'USD' ? '$' : '₡'

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">

      {/* Fila principal */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Color de tarjeta */}
        <div
          className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: tarjeta?.color ?? '#6b7280' }}
        >
          {plan.numeroCuotas}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0" onClick={onToggleExpand}>
          <p className="text-sm font-semibold truncate">{plan.nombreProducto}</p>
          <p className="text-xs text-muted-foreground">
            {tarjeta?.nombre ?? '—'} · {simbolo}{plan.montoCuota.toLocaleString(undefined, { maximumFractionDigits: 2 })}/mes
          </p>

          {/* Barra de progreso */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
              {pagadas}/{total}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEliminar}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={onToggleExpand}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          >
            <motion.div animate={{ rotate: expandido ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={16} />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Confirmación borrado */}
      <AnimatePresence>
        {eliminando && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-destructive/10 border-t border-destructive/20">
              <p className="text-sm text-destructive font-medium">¿Eliminar plan y todas sus cuotas?</p>
              <div className="flex gap-2">
                <button
                  onClick={onCancelarEliminar}
                  className="h-8 px-3 rounded-lg text-xs text-muted-foreground border border-border"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirmarEliminar}
                  className="h-8 px-3 rounded-lg text-xs bg-destructive text-white font-semibold"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de cuotas expandida */}
      <AnimatePresence>
        {expandido && cuotas && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border divide-y divide-border">
              {cuotas.map((cuota) => (
                <CuotaFila
                  key={cuota.id}
                  cuota={cuota}
                  total={total}
                  simbolo={simbolo}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

// ─── Cuota Fila ───────────────────────────────────────────────────────────────

function CuotaFila({
  cuota, total, simbolo,
}: {
  cuota: CuotaMensual
  total: number
  simbolo: string
}) {
  const [cargando, setCargando] = useState(false)
  const efectivo = estadoEfectivo(cuota)

  async function toggleEstado() {
    setCargando(true)
    try {
      const nuevoEstado = cuota.estado === EstadoCuota.Pagada
        ? EstadoCuota.Pendiente
        : EstadoCuota.Pagada
      await cuotasMensualesRepository.actualizarEstado(cuota.id, nuevoEstado)
    } finally {
      setCargando(false)
    }
  }

  const iconEstado = efectivo === EstadoCuota.Pagada
    ? <CheckCircle2 size={18} className="text-emerald-500" />
    : efectivo === EstadoCuota.Vencida
      ? <AlertCircle size={18} className="text-destructive" />
      : <Circle size={18} className="text-muted-foreground" />

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {/* Toggle estado */}
      <button
        onClick={toggleEstado}
        disabled={cargando}
        className="shrink-0 transition-opacity disabled:opacity-40"
      >
        {iconEstado}
      </button>

      {/* Mes + cuota # */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium',
          efectivo === EstadoCuota.Pagada && 'line-through text-muted-foreground'
        )}>
          {labelMes(cuota.mes, cuota.anio)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Cuota {cuota.numeroCuota} de {total}
        </p>
      </div>

      {/* Monto */}
      <p className={cn(
        'text-sm font-semibold tabular-nums shrink-0',
        efectivo === EstadoCuota.Pagada && 'text-muted-foreground line-through',
        efectivo === EstadoCuota.Vencida && 'text-destructive',
      )}>
        {simbolo}{cuota.monto.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>

      {/* Badge estado */}
      <span className={cn(
        'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize',
        efectivo === EstadoCuota.Pagada  && 'bg-emerald-500/15 text-emerald-500',
        efectivo === EstadoCuota.Vencida && 'bg-destructive/15 text-destructive',
        efectivo === EstadoCuota.Pendiente && 'bg-secondary text-muted-foreground',
      )}>
        {efectivo}
      </span>
    </div>
  )
}
