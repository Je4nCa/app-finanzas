import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CreditCard, Repeat2, ReceiptText, Wallet, ChevronRight as Arrow } from 'lucide-react'
import { db } from '@/database/db'
import { useMonedaStore, useUsuarioStore } from '@/store'
import { calcularPartes } from '@/services/compartido.service'
import { EstadoCuota } from '@/types'
import { cn } from '@/lib/utils'
import PageWrapper from '@components/ui/PageWrapper'
import type { Gasto, GastoFijo, CuotaMensual, PlanCuotas, Usuario } from '@/types'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function mesAnterior(anio: number, mes: number) {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 }
}
function mesSiguiente(anio: number, mes: number) {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 }
}

function toBase(monto: number, origen: 'USD'|'CRC', base: 'USD'|'CRC', tc: number, tcMomento?: number) {
  if (origen === base) return monto
  const t = tcMomento ?? tc
  return origen === 'USD' ? monto * t : monto / t
}

interface Totales {
  totalGastos: number
  totalCuotas: number
  totalFijos: number
  total: number
  porUsuario: Record<string, number>
}

function calcularTotales(
  gastos: Gasto[], cuotas: CuotaMensual[], planes: PlanCuotas[],
  gastosFijos: GastoFijo[], usuarios: Usuario[],
  monedaBase: 'USD'|'CRC', tipoCambio: number,
): Totales {
  const porUsuario: Record<string, number> = {}
  usuarios.forEach((u) => { porUsuario[u.id] = 0 })

  let totalGastos = 0
  for (const g of gastos) {
    const m = toBase(g.monto, g.moneda, monedaBase, tipoCambio, g.tipoCambioAlMomento)
    totalGastos += m
    if (g.esCompartido && g.detalleCompartido) {
      const p = calcularPartes(m, g.detalleCompartido)
      if (porUsuario[g.usuarioId] !== undefined) porUsuario[g.usuarioId] += p.montoPagador
      const otro = usuarios.find((u) => u.id !== g.usuarioId)
      if (otro && porUsuario[otro.id] !== undefined) porUsuario[otro.id] += p.montoOtro
    } else {
      if (porUsuario[g.usuarioId] !== undefined) porUsuario[g.usuarioId] += m
    }
  }

  let totalCuotas = 0
  for (const cuota of cuotas) {
    const plan = planes.find((p) => p.id === cuota.planCuotasId)
    if (!plan) continue
    const m = toBase(cuota.monto, plan.moneda, monedaBase, tipoCambio)
    totalCuotas += m
    if (plan.esCompartido && plan.detalleCompartido) {
      const p = calcularPartes(m, plan.detalleCompartido)
      if (porUsuario[plan.usuarioId] !== undefined) porUsuario[plan.usuarioId] += p.montoPagador
      const otro = usuarios.find((u) => u.id !== plan.usuarioId)
      if (otro && porUsuario[otro.id] !== undefined) porUsuario[otro.id] += p.montoOtro
    } else {
      if (porUsuario[plan.usuarioId] !== undefined) porUsuario[plan.usuarioId] += m
    }
  }

  let totalFijos = 0
  for (const fijo of gastosFijos) {
    const m = toBase(fijo.monto, fijo.moneda, monedaBase, tipoCambio)
    totalFijos += m
    if (fijo.esCompartido && fijo.detalleCompartido) {
      const p = calcularPartes(m, fijo.detalleCompartido)
      if (porUsuario[fijo.usuarioId] !== undefined) porUsuario[fijo.usuarioId] += p.montoPagador
      const otro = usuarios.find((u) => u.id !== fijo.usuarioId)
      if (otro && porUsuario[otro.id] !== undefined) porUsuario[otro.id] += p.montoOtro
    } else {
      if (porUsuario[fijo.usuarioId] !== undefined) porUsuario[fijo.usuarioId] += m
    }
  }

  return { totalGastos, totalCuotas, totalFijos, total: totalGastos + totalCuotas + totalFijos, porUsuario }
}

function fmt(n: number, moneda: 'USD'|'CRC') {
  const s = moneda === 'USD' ? '$' : '₡'
  return `${s}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const now   = new Date()
  const [periodo, setPeriodo] = useState({ anio: now.getFullYear(), mes: now.getMonth() + 1 })
  const { monedaBase, tipoCambio } = useMonedaStore()
  const usuarioActivo = useUsuarioStore((s) => s.usuarioActivo)
  const navigate = useNavigate()

  const prefijo = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`

  // Gastos variables del mes
  const gastos = useLiveQuery(
    () => db.gastos.where('fecha').startsWith(prefijo).toArray(),
    [prefijo]
  )

  // Gastos fijos activos — usa filter() para evitar problemas con boolean en Dexie
  const gastosFijos = useLiveQuery(
    () => db.gastosFijos.filter((f) => f.activo).toArray(),
    []
  )

  // Cuotas del mes usando el índice compuesto [anio+mes]
  const cuotas = useLiveQuery(
    () => db.cuotasMensuales
      .where('[anio+mes]')
      .equals([periodo.anio, periodo.mes])
      .toArray(),
    [periodo.anio, periodo.mes]
  )

  const planes   = useLiveQuery(() => db.planesCuotas.toArray(), [])
  const usuarios = useLiveQuery(() => db.usuarios.toArray(), [])

  const totales = useMemo(() => {
    if (!gastos || !cuotas || !planes || !gastosFijos || !usuarios) return null
    const cuotasPendientes = cuotas.filter((c) => c.estado !== EstadoCuota.Pagada)
    return calcularTotales(gastos, cuotasPendientes, planes, gastosFijos, usuarios, monedaBase, tipoCambio)
  }, [gastos, cuotas, planes, gastosFijos, usuarios, monedaBase, tipoCambio])

  const esMesActual = periodo.anio === now.getFullYear() && periodo.mes === now.getMonth() + 1
  const loading     = !totales

  return (
    <PageWrapper className="px-4 py-6 flex flex-col gap-5">

      {/* Header: usuario activo + navegación mes */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{MESES[periodo.mes - 1]}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{periodo.anio}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge usuario activo */}
          {usuarioActivo && (
            <button
              onClick={() => navigate('/ajustes')}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-secondary text-sm font-medium"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: usuarioActivo.color }}
              />
              <span className="text-xs">{usuarioActivo.nombre}</span>
              <Arrow size={12} className="text-muted-foreground" />
            </button>
          )}

          {/* Navegación mes */}
          <div className="flex items-center">
            <button
              onClick={() => setPeriodo((p) => mesAnterior(p.anio, p.mes))}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-medium tabular-nums text-muted-foreground w-12 text-center">
              {MESES_CORTO[periodo.mes - 1]} {String(periodo.anio).slice(2)}
            </span>
            <button
              onClick={() => !esMesActual && setPeriodo((p) => mesSiguiente(p.anio, p.mes))}
              disabled={esMesActual}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                esMesActual ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:bg-secondary'
              )}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── Total del mes ─── */}
          <div className="rounded-2xl bg-card border border-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Wallet size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Total del mes</p>
                <p className="text-2xl font-bold tabular-nums">{fmt(totales.total, monedaBase)}</p>
              </div>
            </div>

            {/* Breakdown por usuario */}
            {usuarios && usuarios.length > 0 && totales.total > 0 && (
              <div className="flex flex-col gap-3 pt-3 border-t border-border">
                {usuarios.map((u) => {
                  const monto = totales.porUsuario[u.id] ?? 0
                  const pct   = totales.total > 0 ? (monto / totales.total) * 100 : 0
                  return (
                    <div key={u.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: u.color }} />
                          <span className="text-sm font-medium">{u.nombre}</span>
                          {usuarioActivo?.id === u.id && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                              yo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold tabular-nums">{fmt(monto, monedaBase)}</span>
                          <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: u.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {totales.total === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Sin gastos registrados este mes
              </p>
            )}
          </div>

          {/* ── 3 stat cards ─── */}
          <div className="flex flex-col gap-3">
            <StatCard
              icon={<ReceiptText size={18} className="text-blue-400" />}
              iconBg="bg-blue-400/15"
              label="Gastos variables"
              valor={fmt(totales.totalGastos, monedaBase)}
              sub={`${gastos?.length ?? 0} registro${(gastos?.length ?? 0) !== 1 ? 's' : ''}`}
            />
            <StatCard
              icon={<CreditCard size={18} className="text-violet-400" />}
              iconBg="bg-violet-400/15"
              label="Cuotas pendientes"
              valor={fmt(totales.totalCuotas, monedaBase)}
              sub={`${cuotas?.filter((c) => c.estado !== EstadoCuota.Pagada).length ?? 0} cuota${(cuotas?.filter((c) => c.estado !== EstadoCuota.Pagada).length ?? 0) !== 1 ? 's' : ''}`}
            />
            <StatCard
              icon={<Repeat2 size={18} className="text-amber-400" />}
              iconBg="bg-amber-400/15"
              label="Gastos fijos (mes)"
              valor={fmt(totales.totalFijos, monedaBase)}
              sub={`${gastosFijos?.length ?? 0} activo${(gastosFijos?.length ?? 0) !== 1 ? 's' : ''}`}
            />
          </div>
        </>
      )}
    </PageWrapper>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ icon, iconBg, label, valor, sub }: {
  icon: React.ReactNode; iconBg: string; label: string; valor: string; sub: string
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-card border border-border">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums">{valor}</p>
      </div>
      <p className="text-xs text-muted-foreground shrink-0">{sub}</p>
    </div>
  )
}
