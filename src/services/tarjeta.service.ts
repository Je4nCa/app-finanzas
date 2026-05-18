import {
  tarjetasRepository,
  gastosRepository,
  gastosFijosRepository,
  planesCuotasRepository,
  cuotasMensualesRepository,
} from '@/repositories'
import { periodoFacturacion } from '@/lib/billingCycle'
import type { ID, PeriodoMensual, Moneda } from '@/types'

export interface TotalMensualTarjeta {
  tarjetaId: ID
  periodo: PeriodoMensual
  moneda: Moneda
  subtotalGastos: number
  subtotalGastosFijos: number
  subtotalCuotas: number
  total: number
  limiteRestante?: number
}

export async function calcularTotalMensual(
  tarjetaId: ID,
  periodo: PeriodoMensual,
  tipoCambio: number
): Promise<TotalMensualTarjeta> {
  const { anio, mes } = periodo

  const tarjeta = await tarjetasRepository.obtenerPorId(tarjetaId)
  if (!tarjeta) throw new Error(`Tarjeta no encontrada: ${tarjetaId}`)

  const monedaTarjeta = tarjeta.moneda

  // Para tarjetas de crédito: filtrar gastos por período de facturación (cierre → siguiente cierre)
  // Para tarjetas de débito: usar mes calendario
  const filtrarGasto = tarjeta.tipo === 'credito' && tarjeta.diaCierre
    ? (() => {
        const { desde, hasta } = periodoFacturacion(anio, mes, tarjeta.diaCierre!)
        return (fecha: string) => fecha >= desde && fecha <= hasta
      })()
    : (fecha: string) => fecha.startsWith(`${anio}-${String(mes).padStart(2, '0')}`)

  const [todosGastos, todosGastosFijos, planes, cuotasDelMes] = await Promise.all([
    gastosRepository.obtenerTodos(),
    gastosFijosRepository.obtenerTodos(),
    planesCuotasRepository.obtenerPorTarjeta(tarjetaId),
    cuotasMensualesRepository.obtenerPorPeriodo(anio, mes),
  ])

  // 1. Gastos variables del período de facturación para esta tarjeta
  const gastos = todosGastos.filter(
    (g) => g.tarjetaId === tarjetaId && filtrarGasto(g.fecha)
  )
  const subtotalGastos = gastos.reduce(
    (suma, g) =>
      suma + convertir(g.monto, g.moneda, monedaTarjeta, g.tipoCambioAlMomento ?? tipoCambio),
    0
  )

  // 2. Gastos fijos activos de esta tarjeta (mensuales, sin fecha específica)
  const gastosFijos = todosGastosFijos.filter((g) => g.activo && g.tarjetaId === tarjetaId)
  const subtotalGastosFijos = gastosFijos.reduce(
    (suma, g) => suma + convertir(g.monto, g.moneda, monedaTarjeta, tipoCambio),
    0
  )

  // 3. Cuotas del mes para los planes de esta tarjeta (ya están asignadas por mes de cobro)
  const planIds        = new Set(planes.map((p) => p.id))
  const monedaPorPlan  = Object.fromEntries(planes.map((p) => [p.id, p.moneda]))
  const cuotas         = cuotasDelMes.filter((c) => planIds.has(c.planCuotasId))
  const subtotalCuotas = cuotas.reduce(
    (suma, c) =>
      suma +
      convertir(
        c.monto,
        monedaPorPlan[c.planCuotasId] ?? monedaTarjeta,
        monedaTarjeta,
        tipoCambio
      ),
    0
  )

  const total = subtotalGastos + subtotalGastosFijos + subtotalCuotas

  return {
    tarjetaId,
    periodo,
    moneda: monedaTarjeta,
    subtotalGastos,
    subtotalGastosFijos,
    subtotalCuotas,
    total,
    limiteRestante: tarjeta.limite != null ? tarjeta.limite - total : undefined,
  }
}

export async function calcularTotalTodasLasTarjetas(
  periodo: PeriodoMensual,
  tipoCambio: number,
  monedaBase: Moneda
): Promise<{ porTarjeta: TotalMensualTarjeta[]; granTotal: number }> {
  const tarjetas = await tarjetasRepository.obtenerTodas()

  const porTarjeta = await Promise.all(
    tarjetas.map((t) => calcularTotalMensual(t.id, periodo, tipoCambio))
  )

  const granTotal = porTarjeta.reduce(
    (suma, r) => suma + convertir(r.total, r.moneda, monedaBase, tipoCambio),
    0
  )

  return { porTarjeta, granTotal }
}

function convertir(monto: number, de: Moneda, a: Moneda, tipoCambio: number): number {
  if (de === a) return monto
  if (de === 'USD' && a === 'CRC') return monto * tipoCambio
  if (de === 'CRC' && a === 'USD') return monto / tipoCambio
  return monto
}
