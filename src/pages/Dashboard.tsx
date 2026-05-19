import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CreditCard, Repeat2, ReceiptText, Wallet, ChevronRight as Arrow, Plus, TrendingDown, FileSpreadsheet, Calculator } from 'lucide-react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { periodoFacturacion } from '@/lib/billingCycle'
import { useMonedaStore, useUsuarioStore } from '@/store'
import { salariosRepository } from '@/repositories'
import { calcularPartes } from '@/services/compartido.service'
import { EstadoCuota } from '@/types'
import { cn } from '@/lib/utils'
import { nanoid } from 'nanoid'
import PageWrapper from '@components/ui/PageWrapper'
import CalculadorPago from '@components/CalculadorPago'
import { generarReporteExcel } from '@/lib/generarReporte'
import type { Gasto, GastoFijo, CuotaMensual, PlanCuotas, Usuario, TarjetaCredito, Salario } from '@/types'

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

function conv(monto: number, origen: string, destino: string, tc: number): number {
  if (origen === destino) return monto
  if (origen === 'USD') return monto * tc
  return monto / tc
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

function fmtMoneda(n: number, moneda: string) {
  const s = moneda === 'USD' ? '$' : '₡'
  return `${s}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

// ─── Mini-form para registrar quincena ───────────────────────────────────────

interface FormQuincenaProps {
  usuario: Usuario
  quincena: 1 | 2
  periodo: { anio: number; mes: number }
  monedaDefault: 'USD' | 'CRC'
  onGuardado: () => void
  onCancelar: () => void
}

function FormQuincena({ usuario, quincena, periodo, monedaDefault, onGuardado, onCancelar }: FormQuincenaProps) {
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<'USD'|'CRC'>(monedaDefault)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const montoNum = parseFloat(monto.replace(/,/g, ''))
    if (!montoNum || montoNum <= 0) { setError('Ingresa un monto válido'); return }

    setGuardando(true)
    setError(null)
    try {
      const salario: Salario = {
        id: nanoid(),
        usuarioId: usuario.id,
        monto: montoNum,
        moneda,
        anio: periodo.anio,
        mes: periodo.mes,
        quincena,
        creadoEn: new Date().toISOString(),
      }
      await salariosRepository.crear(salario)
      onGuardado()
    } catch {
      setError('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-1.5 p-2.5 rounded-xl bg-secondary/60 border border-border">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        {usuario.nombre} · Quincena {quincena}
      </p>
      <div className="flex gap-2">
        <select
          value={moneda}
          onChange={(e) => setMoneda(e.target.value as 'USD'|'CRC')}
          className="h-8 px-2 rounded-lg bg-card border border-border text-xs focus:outline-none"
        >
          <option value="USD">USD ($)</option>
          <option value="CRC">CRC (₡)</option>
        </select>
        <input
          type="number"
          step="any"
          min="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0"
          autoFocus
          className="flex-1 h-8 px-3 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancelar}
          className="h-7 px-2.5 rounded-lg text-[11px] text-muted-foreground border border-border"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="h-7 px-3 rounded-lg text-[11px] bg-primary text-primary-foreground font-semibold disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ─── Tarjeta de salario por usuario ──────────────────────────────────────────

interface TarjetaSalarioProps {
  usuario: Usuario
  salarios: Salario[]
  gastosEnMoneda: number   // gastos del mes del usuario, en su moneda de salario
  periodo: { anio: number; mes: number }
  tipoCambio: number
  monedaDefault: 'USD' | 'CRC'
}

function TarjetaSalario({ usuario, salarios, gastosEnMoneda, periodo, tipoCambio, monedaDefault }: TarjetaSalarioProps) {
  type FormAbierto = null | { quincena: 1 | 2 }
  const [formAbierto, setFormAbierto] = useState<FormAbierto>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const q1 = salarios.filter((s) => s.usuarioId === usuario.id && s.quincena === 1)
  const q2 = salarios.filter((s) => s.usuarioId === usuario.id && s.quincena === 2)

  const totalQ1 = q1.reduce((sum, s) => sum + conv(s.monto, s.moneda, monedaDefault, tipoCambio), 0)
  const totalQ2 = q2.reduce((sum, s) => sum + conv(s.monto, s.moneda, monedaDefault, tipoCambio), 0)
  const totalSalario = totalQ1 + totalQ2
  const saldo = totalSalario - gastosEnMoneda
  const pctGastado = totalSalario > 0 ? Math.min((gastosEnMoneda / totalSalario) * 100, 100) : 0

  function QuincenaRow({ q, num }: { q: Salario[]; num: 1 | 2 }) {
    const total = num === 1 ? totalQ1 : totalQ2
    const yaRegistrado = q.length > 0

    if (formAbierto?.quincena === num) {
      return (
        <FormQuincena
          usuario={usuario}
          quincena={num}
          periodo={periodo}
          monedaDefault={monedaDefault}
          onGuardado={() => setFormAbierto(null)}
          onCancelar={() => setFormAbierto(null)}
        />
      )
    }

    return (
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Quincena {num}</span>
        <div className="flex items-center gap-1.5">
          {yaRegistrado ? (
            <>
              <span className="text-xs font-medium tabular-nums">{fmtMoneda(total, monedaDefault)}</span>
              {q.map((s) => (
                <div key={s.id} className="relative">
                  {eliminandoId === s.id ? (
                    <div className="flex items-center gap-1 bg-destructive/10 rounded px-1.5 py-0.5">
                      <span className="text-[10px] text-destructive">¿Eliminar?</span>
                      <button
                        onClick={() => setEliminandoId(null)}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >No</button>
                      <button
                        onClick={async () => {
                          await salariosRepository.eliminar(s.id)
                          setEliminandoId(null)
                        }}
                        className="text-[10px] text-destructive font-semibold"
                      >Sí</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEliminandoId(s.id)}
                      className="w-4 h-4 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors text-xs leading-none"
                    >×</button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setFormAbierto({ quincena: num })}
                className="w-5 h-5 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors"
                title="Agregar otro ingreso"
              >
                <Plus size={10} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setFormAbierto({ quincena: num })}
              className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors"
            >
              <Plus size={11} />
              Registrar
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header usuario */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: usuario.color }} />
        <span className="text-sm font-semibold">{usuario.nombre}</span>
        <span className="text-xs text-muted-foreground ml-auto">{monedaDefault}</span>
      </div>

      {/* Quincenas */}
      <QuincenaRow q={q1} num={1} />
      <QuincenaRow q={q2} num={2} />

      {/* Totales */}
      {totalSalario > 0 && (
        <div className="pt-2 border-t border-border flex flex-col gap-1.5">
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', pctGastado > 90 ? 'bg-destructive' : pctGastado > 70 ? 'bg-amber-500' : 'bg-green-500')}
              style={{ width: `${pctGastado}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Gastos: {fmtMoneda(gastosEnMoneda, monedaDefault)} ({pctGastado.toFixed(0)}%)
            </span>
            <span className={cn('font-semibold tabular-nums', saldo < 0 ? 'text-destructive' : 'text-green-500')}>
              {saldo >= 0 ? '+' : ''}{fmtMoneda(saldo, monedaDefault)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Salario total</span>
            <span className="font-medium tabular-nums">{fmtMoneda(totalSalario, monedaDefault)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const now   = new Date()
  const [periodo, setPeriodo] = useState({ anio: now.getFullYear(), mes: now.getMonth() + 1 })
  const { monedaBase, tipoCambio } = useMonedaStore()
  const usuarioActivo = useUsuarioStore((s) => s.usuarioActivo)
  const navigate = useNavigate()

  const prefijo = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`

  const todosGastos      = useCollection<Gasto>(() => hCol('gastos'), [])
  const todosGastosFijos = useCollection<GastoFijo>(() => hCol('gastosFijos'), [])
  const todasCuotas      = useCollection<CuotaMensual>(() => hCol('cuotasMensuales'), [])
  const planes           = useCollection<PlanCuotas>(() => hCol('planesCuotas'), [])
  const usuarios         = useCollection<Usuario>(() => hCol('usuarios'), [])
  const tarjetas         = useCollection<TarjetaCredito>(() => hCol('tarjetas'), [])
  const todosSalarios    = useCollection<Salario>(() => hCol('salarios'), [])
  const todosAbonos      = useCollection<{ id: string; usuarioId: string; anio: number; mes: number; monto: number; moneda: string }>(() => hCol('abonosTarjeta'), [])

  const diaCierrePorTarjeta = useMemo(() => {
    const map: Record<string, number | undefined> = {}
    tarjetas?.forEach((t) => { map[t.id] = t.tipo === 'credito' ? t.diaCierre : undefined })
    return map
  }, [tarjetas])

  const gastos = useMemo(() => {
    if (!todosGastos) return undefined
    return todosGastos.filter((g) => {
      const diaCierre = g.tarjetaId ? diaCierrePorTarjeta[g.tarjetaId] : undefined
      if (diaCierre) {
        const { desde, hasta } = periodoFacturacion(periodo.anio, periodo.mes, diaCierre)
        return g.fecha >= desde && g.fecha <= hasta
      }
      return g.fecha.startsWith(prefijo)
    })
  }, [todosGastos, diaCierrePorTarjeta, periodo.anio, periodo.mes, prefijo])

  const gastosFijos = useMemo(
    () => todosGastosFijos?.filter((f) => f.activo),
    [todosGastosFijos]
  )
  const cuotas = useMemo(
    () => todasCuotas?.filter((c) => c.anio === periodo.anio && c.mes === periodo.mes),
    [todasCuotas, periodo.anio, periodo.mes]
  )

  const salarios = useMemo(
    () => todosSalarios?.filter((s) => s.anio === periodo.anio && s.mes === periodo.mes) ?? [],
    [todosSalarios, periodo.anio, periodo.mes]
  )

  const totalesBase = useMemo(() => {
    if (!gastos || !cuotas || !planes || !gastosFijos || !usuarios) return null
    const cuotasPendientes = cuotas.filter((c) => c.estado !== EstadoCuota.Pagada)
    return calcularTotales(gastos, cuotasPendientes, planes, gastosFijos, usuarios, monedaBase, tipoCambio)
  }, [gastos, cuotas, planes, gastosFijos, usuarios, monedaBase, tipoCambio])

  // Subtract abonos from each user's total for the current period
  const totales = useMemo(() => {
    if (!totalesBase) return null
    const abonosPeriodo = todosAbonos?.filter((a) => a.anio === periodo.anio && a.mes === periodo.mes) ?? []
    if (abonosPeriodo.length === 0) return totalesBase

    const porUsuario = { ...totalesBase.porUsuario }
    let totalDescontado = 0
    for (const a of abonosPeriodo) {
      if (!a.usuarioId) continue
      const montoEnBase = toBase(a.monto, a.moneda as 'USD' | 'CRC', monedaBase, tipoCambio)
      if (porUsuario[a.usuarioId] !== undefined) {
        porUsuario[a.usuarioId] = Math.max(0, porUsuario[a.usuarioId] - montoEnBase)
        totalDescontado += montoEnBase
      }
    }
    return {
      ...totalesBase,
      porUsuario,
      total: Math.max(0, totalesBase.total - totalDescontado),
    }
  }, [totalesBase, todosAbonos, periodo, monedaBase, tipoCambio])

  // Per-user expenses in their salary currency (determined by their monedaPreferida)
  const gastosPorUsuarioEnSuMoneda = useMemo(() => {
    if (!totales || !usuarios) return {}
    const result: Record<string, number> = {}
    for (const u of usuarios) {
      const gastoEnBase = totales.porUsuario[u.id] ?? 0
      result[u.id] = conv(gastoEnBase, monedaBase, u.monedaPreferida, tipoCambio)
    }
    return result
  }, [totales, usuarios, monedaBase, tipoCambio])

  const esMesActual = periodo.anio === now.getFullYear() && periodo.mes === now.getMonth() + 1
  const loading     = !totales || !tarjetas

  const [calculadorUsuarioId, setCalculadorUsuarioId] = useState<string | null>(null)
  const calculadorUsuario = calculadorUsuarioId ? usuarios?.find((u) => u.id === calculadorUsuarioId) : null

  function handleDescargarReporte() {
    if (!gastos || !gastosFijos || !planes || !cuotas || !usuarios || !tarjetas) return
    generarReporteExcel({
      periodo,
      usuarios,
      gastos,
      gastosFijos,
      planesCuotas: planes,
      cuotasMensuales: cuotas ?? [],
      tarjetas,
      abonos: (todosAbonos ?? []) as Parameters<typeof generarReporteExcel>[0]['abonos'],
      tipoCambio,
    })
  }

  return (
    <PageWrapper className="px-4 py-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{MESES[periodo.mes - 1]}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{periodo.anio}</p>
        </div>

        <div className="flex items-center gap-2">
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

          {/* ── Salario del mes ─── */}
          {usuarios && usuarios.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                  <TrendingDown size={18} className="text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Salario del mes</p>
                  <p className="text-sm text-muted-foreground font-medium">Quincena 1 + Quincena 2</p>
                </div>
              </div>
              {/* Calculadora buttons per user */}
              <div className="flex gap-2 mb-4">
                {usuarios.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setCalculadorUsuarioId(u.id)}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Calculator size={13} />
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: u.color }}
                    />
                    {u.nombre}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-5">
                {usuarios.map((u, idx) => (
                  <div key={u.id}>
                    {idx > 0 && <div className="border-t border-border -mt-2.5 mb-2.5" />}
                    <TarjetaSalario
                      usuario={u}
                      salarios={salarios}
                      gastosEnMoneda={gastosPorUsuarioEnSuMoneda[u.id] ?? 0}
                      periodo={periodo}
                      tipoCambio={tipoCambio}
                      monedaDefault={u.monedaPreferida as 'USD'|'CRC'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* ── Reporte Excel ─── */}
          <button
            onClick={handleDescargarReporte}
            className="flex items-center justify-center gap-2 h-12 rounded-2xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <FileSpreadsheet size={18} className="text-green-500" />
            Descargar reporte Excel
          </button>
        </>
      )}

      {/* ── Calculadora de pago (modal) ─── */}
      {calculadorUsuario && totales && (
        <CalculadorPago
          usuario={calculadorUsuario}
          totalEnMoneda={(() => {
            const gastoBase = totales.porUsuario[calculadorUsuario.id] ?? 0
            return calculadorUsuario.monedaPreferida === monedaBase
              ? gastoBase
              : monedaBase === 'USD'
                ? gastoBase * tipoCambio
                : gastoBase / tipoCambio
          })()}
          monedaUsuario={calculadorUsuario.monedaPreferida as 'USD' | 'CRC'}
          tipoCambio={tipoCambio}
          tipoCambioCompra={useMonedaStore.getState().tipoCambioCompra}
          onCerrar={() => setCalculadorUsuarioId(null)}
        />
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
