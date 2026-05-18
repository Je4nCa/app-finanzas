import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { tarjetasRepository } from '@/repositories'
import { useMonedaStore } from '@/store'
import { periodoFacturacion } from '@/lib/billingCycle'
import { cn } from '@/lib/utils'
import PageWrapper from '@components/ui/PageWrapper'
import FormularioTarjeta from '@components/tarjetas/FormularioTarjeta'
import type { TarjetaCredito, Gasto, GastoFijo, CuotaMensual, PlanCuotas } from '@/types'

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtFecha(iso: string): string {
  // iso = YYYY-MM-DD
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

// ─── Credit card billing summary ─────────────────────────────────────────────

interface ResumenCreditoProps {
  tarjeta: TarjetaCredito
  periodo: { anio: number; mes: number }
  gastos: Gasto[]
  gastosFijos: GastoFijo[]
  planesCuotas: PlanCuotas[]
  cuotasMensuales: CuotaMensual[]
  tipoCambio: number
}

function ResumenCredito({
  tarjeta,
  periodo,
  gastos,
  gastosFijos,
  planesCuotas,
  cuotasMensuales,
  tipoCambio,
}: ResumenCreditoProps) {
  const { desde, hasta } = periodoFacturacion(periodo.anio, periodo.mes, tarjeta.diaCierre ?? 1)
  const simbolo = tarjeta.moneda === 'USD' ? '$' : '₡'

  function conv(monto: number, monedaOrigen: string): number {
    if (monedaOrigen === tarjeta.moneda) return monto
    if (monedaOrigen === 'USD') return monto * tipoCambio
    return monto / tipoCambio
  }

  const { subtotalVar, subtotalFijos, subtotalCuotas, total } = useMemo(() => {
    // Variables: in billing period
    const subtotalVar = gastos
      .filter((g) => g.tarjetaId === tarjeta.id && g.fecha >= desde && g.fecha <= hasta)
      .reduce((sum, g) => sum + conv(g.monto, g.moneda), 0)

    // Fijos: activo only
    const subtotalFijos = gastosFijos
      .filter((g) => g.tarjetaId === tarjeta.id && g.activo)
      .reduce((sum, g) => sum + conv(g.monto, g.moneda), 0)

    // Cuotas: plans belonging to this card, cuotas matching anio/mes
    const planIds = new Set(
      planesCuotas.filter((p) => p.tarjetaId === tarjeta.id).map((p) => p.id)
    )
    const subtotalCuotas = cuotasMensuales
      .filter((c) => planIds.has(c.planCuotasId) && c.anio === periodo.anio && c.mes === periodo.mes)
      .reduce((sum, c) => {
        const plan = planesCuotas.find((p) => p.id === c.planCuotasId)
        return sum + conv(c.monto, plan?.moneda ?? tarjeta.moneda)
      }, 0)

    return {
      subtotalVar,
      subtotalFijos,
      subtotalCuotas,
      total: subtotalVar + subtotalFijos + subtotalCuotas,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos, gastosFijos, planesCuotas, cuotasMensuales, tarjeta.id, desde, hasta, periodo.anio, periodo.mes, tipoCambio])

  const porcentaje = tarjeta.limite ? Math.min((total / tarjeta.limite) * 100, 100) : null

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {/* Billing period header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Período: {fmtFecha(desde)} – {fmtFecha(hasta)}</span>
        {tarjeta.diaPago && (
          <span>Pago el día {tarjeta.diaPago}</span>
        )}
      </div>

      {/* Total prominent */}
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total a pagar</span>
        <span className="text-xl font-bold tabular-nums">
          {simbolo}{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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

      {/* Subtotal rows */}
      <div className="flex flex-col gap-1 pt-0.5">
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
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Tarjetas() {
  const tipoCambio = useMonedaStore((s) => s.tipoCambio)

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
