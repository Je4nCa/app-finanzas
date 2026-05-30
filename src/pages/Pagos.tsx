import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { periodoFacturacion } from '@/lib/billingCycle'
import { cn } from '@/lib/utils'
import PageWrapper from '@components/ui/PageWrapper'
import { useMonedaStore } from '@/store'
import { TipoGastoCompartido } from '@/types'
import type {
  TarjetaCredito, Gasto, GastoFijo, PlanCuotas, CuotaMensual,
  AbonoTarjeta, MontoManualTarjeta, Usuario, DetalleCompartido,
} from '@/types'

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtFecha(iso: string): string {
  const [, mm, dd] = iso.split('-')
  return `${parseInt(dd)} ${MESES_CORTO[parseInt(mm) - 1]}`
}

function cvt(monto: number, de: string, a: string, tc: number): number {
  if (de === a) return monto
  if (de === 'USD') return monto * tc
  return monto / tc
}

function partirMonto(
  montoConv: number,
  uid: string,
  otroUid: string,
  esCompartido: boolean,
  det?: DetalleCompartido
): Record<string, number> {
  if (!esCompartido || !det) return { [uid]: montoConv }
  switch (det.tipo) {
    case TipoGastoCompartido.MitadMitad:
      return { [uid]: montoConv / 2, [otroUid]: montoConv / 2 }
    case TipoGastoCompartido.PorcentajePersonalizado: {
      const p = (det.porcentajeMio ?? 50) / 100
      return { [uid]: montoConv * p, [otroUid]: montoConv * (1 - p) }
    }
    case TipoGastoCompartido.UnoPagaTodo:
      return det.usuarioQuePagaId
        ? { [det.usuarioQuePagaId]: montoConv }
        : { [uid]: montoConv }
    case TipoGastoCompartido.MontosFijos: {
      const s = (det.montoFijoMio ?? 0) + (det.montoFijoOtro ?? 0)
      if (!s) return { [uid]: montoConv }
      return {
        [uid]: montoConv * ((det.montoFijoMio ?? 0) / s),
        [otroUid]: montoConv * ((det.montoFijoOtro ?? 0) / s),
      }
    }
    default: return { [uid]: montoConv }
  }
}

interface LineaPago {
  id: string
  titulo: string
  tipo: 'variable' | 'fijo' | 'cuota'
  cuotaNum?: number
  cuotaTotal?: number
  partesUsuario: Record<string, number>
}

interface ResumenPago {
  desde: string
  hasta: string
  fechaPago: Date | null
  lineas: LineaPago[]
  totalPorUsuario: Record<string, number>
  abonosPorUsuario: Record<string, number>
  pendientePorUsuario: Record<string, number>
  tieneManual: boolean
}

function calcularResumen(
  tarjeta: TarjetaCredito,
  periodo: { anio: number; mes: number },
  usuarios: Usuario[],
  gastos: Gasto[],
  gastosFijos: GastoFijo[],
  planes: PlanCuotas[],
  cuotas: CuotaMensual[],
  abonos: AbonoTarjeta[],
  montoManual: MontoManualTarjeta | undefined,
  tc: number
): ResumenPago {
  const moneda = tarjeta.moneda
  const { desde, hasta } = periodoFacturacion(periodo.anio, periodo.mes, tarjeta.diaCierre ?? 1)
  const uids = usuarios.map(u => u.id)
  const getOtro = (id: string) => uids.find(u => u !== id) ?? id

  const totals: Record<string, number> = Object.fromEntries(uids.map(id => [id, 0]))
  const lineas: LineaPago[] = []

  // Gastos variables del período de facturación
  gastos
    .filter(g => g.tarjetaId === tarjeta.id && g.fecha >= desde && g.fecha <= hasta)
    .forEach(g => {
      const m = cvt(g.monto, g.moneda, moneda, g.tipoCambioAlMomento ?? tc)
      const p = partirMonto(m, g.usuarioId, getOtro(g.usuarioId), g.esCompartido, g.detalleCompartido)
      for (const [uid, v] of Object.entries(p)) if (uid in totals) totals[uid] += v
      lineas.push({ id: g.id, titulo: g.titulo, tipo: 'variable', partesUsuario: p })
    })

  // Gastos fijos activos de esta tarjeta
  gastosFijos
    .filter(g => g.tarjetaId === tarjeta.id && g.activo)
    .forEach(g => {
      const m = cvt(g.monto, g.moneda, moneda, tc)
      const p = partirMonto(m, g.usuarioId, getOtro(g.usuarioId), g.esCompartido, g.detalleCompartido)
      for (const [uid, v] of Object.entries(p)) if (uid in totals) totals[uid] += v
      lineas.push({ id: g.id, titulo: g.titulo, tipo: 'fijo', partesUsuario: p })
    })

  // Cuotas del mes para esta tarjeta
  const planSet = new Set(planes.filter(p => p.tarjetaId === tarjeta.id).map(p => p.id))
  const planMap = Object.fromEntries(planes.map(p => [p.id, p]))
  cuotas
    .filter(c => planSet.has(c.planCuotasId) && c.anio === periodo.anio && c.mes === periodo.mes)
    .forEach(c => {
      const plan = planMap[c.planCuotasId]
      if (!plan) return
      const m = cvt(c.monto, plan.moneda, moneda, tc)
      const p = partirMonto(m, plan.usuarioId, getOtro(plan.usuarioId), plan.esCompartido, plan.detalleCompartido)
      for (const [uid, v] of Object.entries(p)) if (uid in totals) totals[uid] += v
      lineas.push({ id: c.id, titulo: plan.nombreProducto, tipo: 'cuota', cuotaNum: c.numeroCuota, cuotaTotal: plan.numeroCuotas, partesUsuario: p })
    })

  // Si hay monto manual, escalar los totales proporcionalmente
  const totalCalc = Object.values(totals).reduce((a, b) => a + b, 0)
  const totalsFinales = { ...totals }
  if (montoManual && totalCalc > 0) {
    const ratio = montoManual.monto / totalCalc
    for (const uid of uids) totalsFinales[uid] = (totals[uid] ?? 0) * ratio
  }

  // Abonos por usuario en este período
  const abo: Record<string, number> = Object.fromEntries(uids.map(id => [id, 0]))
  abonos
    .filter(a => a.tarjetaId === tarjeta.id && a.anio === periodo.anio && a.mes === periodo.mes)
    .forEach(a => {
      const m = cvt(a.monto, a.moneda, moneda, tc)
      if (a.usuarioId in abo) abo[a.usuarioId] += m
    })

  // Pendiente = asignado - abonado
  const pendiente: Record<string, number> = {}
  for (const uid of uids) pendiente[uid] = (totalsFinales[uid] ?? 0) - (abo[uid] ?? 0)

  // Calcular la fecha real de pago: primer diaPago después del cierre del período
  let fechaPago: Date | null = null
  if (tarjeta.diaPago) {
    const hastaDate = new Date(hasta)
    let candidate = new Date(hastaDate.getFullYear(), hastaDate.getMonth(), tarjeta.diaPago)
    if (candidate <= hastaDate) {
      candidate = new Date(hastaDate.getFullYear(), hastaDate.getMonth() + 1, tarjeta.diaPago)
    }
    fechaPago = candidate
  }

  return { desde, hasta, fechaPago, lineas, totalPorUsuario: totalsFinales, abonosPorUsuario: abo, pendientePorUsuario: pendiente, tieneManual: !!montoManual }
}

// ─── Componente de tarjeta de pago ────────────────────────────────────────────

interface PagoCardProps {
  tarjeta: TarjetaCredito
  resumen: ResumenPago
  usuarios: Usuario[]
}

function PagoCard({ tarjeta, resumen, usuarios }: PagoCardProps) {
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({})
  const simbolo = tarjeta.moneda === 'USD' ? '$' : '₡'

  const { etiquetaVenc, colorVenc } = useMemo(() => {
    if (!resumen.fechaPago) return { diasVenc: null, etiquetaVenc: '', colorVenc: 'text-muted-foreground' }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const pago = new Date(resumen.fechaPago); pago.setHours(0, 0, 0, 0)
    const dias = Math.round((pago.getTime() - hoy.getTime()) / 86400000)
    const texto = dias < 0
      ? `Venció hace ${-dias}d`
      : dias === 0 ? 'Vence hoy'
      : dias === 1 ? 'Vence mañana'
      : `${MESES_CORTO[pago.getMonth()]} ${pago.getDate()} (${dias}d)`
    const color = dias < 0
      ? 'text-destructive'
      : dias <= 1 ? 'text-amber-500'
      : dias <= 5 ? 'text-amber-400'
      : 'text-muted-foreground'
    return { etiquetaVenc: texto, colorVenc: color }
  }, [resumen.fechaPago])

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Encabezado de tarjeta */}
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <div className="w-9 h-9 rounded-xl shrink-0" style={{ backgroundColor: tarjeta.color }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{tarjeta.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {fmtFecha(resumen.desde)} – {fmtFecha(resumen.hasta)}
          </p>
        </div>
        {resumen.fechaPago && (
          <div className="text-right shrink-0">
            <p className={cn('text-xs font-semibold', colorVenc)}>{etiquetaVenc}</p>
            <p className="text-[10px] text-muted-foreground">día {tarjeta.diaPago}</p>
          </div>
        )}
      </div>

      {/* Desglose por usuario */}
      <div className="divide-y divide-border">
        {usuarios.map(usuario => {
          const total     = resumen.totalPorUsuario[usuario.id] ?? 0
          const abonado   = resumen.abonosPorUsuario[usuario.id] ?? 0
          const pendiente = resumen.pendientePorUsuario[usuario.id] ?? 0
          const items     = resumen.lineas.filter(l => (l.partesUsuario[usuario.id] ?? 0) > 0.005)
          const expandido = expandidos[usuario.id] ?? false
          const pagado    = pendiente <= 0 && total > 0

          return (
            <div key={usuario.id} className="p-4">
              {/* Nombre + monto pendiente */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: usuario.color }} />
                  <span className="font-semibold text-sm">{usuario.nombre}</span>
                  {pagado && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-500">
                      Saldado
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className={cn('text-xl font-bold tabular-nums', pagado ? 'text-green-500' : '')}>
                    {simbolo}{Math.max(0, pendiente).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-none">pendiente</p>
                </div>
              </div>

              {/* Resumen de cálculo */}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mb-3">
                <span>
                  Asignado:{' '}
                  <span className="text-foreground font-medium tabular-nums">
                    {simbolo}{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </span>
                {abonado > 0 && (
                  <span>
                    Abonado:{' '}
                    <span className="text-green-500 font-medium tabular-nums">
                      -{simbolo}{abonado.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </span>
                )}
              </div>

              {/* Lista de items */}
              {items.length > 0 && (
                <>
                  <button
                    onClick={() => setExpandidos(e => ({ ...e, [usuario.id]: !e[usuario.id] }))}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown
                      size={12}
                      className={cn('transition-transform duration-200', expandido && 'rotate-180')}
                    />
                    {expandido ? 'Ocultar' : 'Ver'} {items.length} item{items.length !== 1 ? 's' : ''}
                  </button>

                  {expandido && (
                    <div className="mt-2.5 flex flex-col gap-2">
                      {items.map(linea => {
                        const montoLinea = linea.partesUsuario[usuario.id] ?? 0
                        return (
                          <div key={linea.id} className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                              <span className="text-xs text-foreground truncate">{linea.titulo}</span>
                              {linea.tipo === 'cuota' && linea.cuotaNum != null && (
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  cuota {linea.cuotaNum}/{linea.cuotaTotal}
                                </span>
                              )}
                              {linea.tipo === 'fijo' && (
                                <span className="text-[10px] px-1 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">
                                  fijo
                                </span>
                              )}
                            </div>
                            <span className="text-xs tabular-nums shrink-0 font-medium">
                              {simbolo}{montoLinea.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {items.length === 0 && total === 0 && (
                <p className="text-xs text-muted-foreground">Sin cargos este período</p>
              )}
            </div>
          )
        })}
      </div>

      {resumen.tieneManual && (
        <div className="px-4 pb-3 pt-1 text-[10px] text-amber-500 border-t border-border">
          * Montos ajustados al total manual ingresado en Tarjetas
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Pagos() {
  const tipoCambio = useMonedaStore(s => s.tipoCambio)
  const ahora = new Date()
  const [periodo, setPeriodo] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() + 1 })

  function navMes(delta: number) {
    setPeriodo(p => {
      let mes = p.mes + delta
      let anio = p.anio
      if (mes < 1) { mes = 12; anio-- }
      if (mes > 12) { mes = 1; anio++ }
      return { anio, mes }
    })
  }

  const tarjetas    = useCollection<TarjetaCredito>(() => hCol('tarjetas'), [])
  const gastos      = useCollection<Gasto>(() => hCol('gastos'), [])
  const gastosFijos = useCollection<GastoFijo>(() => hCol('gastosFijos'), [])
  const planes      = useCollection<PlanCuotas>(() => hCol('planesCuotas'), [])
  const cuotas      = useCollection<CuotaMensual>(() => hCol('cuotasMensuales'), [])
  const abonos      = useCollection<AbonoTarjeta>(() => hCol('abonosTarjeta'), [])
  const manuales    = useCollection<MontoManualTarjeta>(() => hCol('montosManualesTarjeta'), [])
  const usuarios    = useCollection<Usuario>(() => hCol('usuarios'), [])

  const tarjetasCredito = useMemo(
    () => (tarjetas ?? []).filter(t => t.tipo === 'credito' && t.diaCierre),
    [tarjetas]
  )

  const resumenes = useMemo(() => {
    if (!usuarios?.length) return []
    return tarjetasCredito.map(tarjeta => ({
      tarjeta,
      resumen: calcularResumen(
        tarjeta,
        periodo,
        usuarios!,
        gastos ?? [],
        gastosFijos ?? [],
        planes ?? [],
        cuotas ?? [],
        abonos ?? [],
        manuales?.find(m => m.tarjetaId === tarjeta.id && m.anio === periodo.anio && m.mes === periodo.mes),
        tipoCambio
      ),
    }))
  }, [tarjetasCredito, periodo, usuarios, gastos, gastosFijos, planes, cuotas, abonos, manuales, tipoCambio])

  return (
    <PageWrapper className="px-4 py-6 flex flex-col gap-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">¿Cuánto debe pagar cada uno?</p>
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
        </div>
      </div>

      {tarjetasCredito.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-4xl">💳</span>
          <p className="text-muted-foreground text-sm">No hay tarjetas de crédito configuradas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {resumenes.map(({ tarjeta, resumen }) => (
            <PagoCard
              key={tarjeta.id}
              tarjeta={tarjeta}
              resumen={resumen}
              usuarios={usuarios ?? []}
            />
          ))}
        </div>
      )}

    </PageWrapper>
  )
}
