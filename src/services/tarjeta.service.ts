import { db } from '@/database/db'
import type { ID, PeriodoMensual, Moneda } from '@/types'

// ─── Resultado ────────────────────────────────────────────────────────────────

export interface TotalMensualTarjeta {
  tarjetaId: ID
  periodo: PeriodoMensual
  moneda: Moneda
  /** Gastos de ese mes cargados directamente a la tarjeta */
  subtotalGastos: number
  /** Gastos fijos activos asignados a la tarjeta */
  subtotalGastosFijos: number
  /** Cuotas de tasa cero que caen en ese mes */
  subtotalCuotas: number
  /** Suma de los tres anteriores */
  total: number
  /** Solo presente si la tarjeta tiene límite definido */
  limiteRestante?: number
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Calcula el total a pagar de una tarjeta en un mes dado.
 * Suma: gastos variables + gastos fijos + cuotas mensuales.
 * Todos los montos se expresan en la moneda de la tarjeta.
 */
export async function calcularTotalMensual(
  tarjetaId: ID,
  periodo: PeriodoMensual,
  tipoCambio: number
): Promise<TotalMensualTarjeta> {
  const { anio, mes } = periodo

  const tarjeta = await db.tarjetas.get(tarjetaId)
  if (!tarjeta) throw new Error(`Tarjeta no encontrada: ${tarjetaId}`)

  const monedaTarjeta = tarjeta.moneda

  // ── 1. Gastos variables del mes ─────────────────────────────────────────────
  const prefijoFecha = `${anio}-${String(mes).padStart(2, '0')}`

  const gastos = await db.gastos
    .where('fecha')
    .startsWith(prefijoFecha)
    .filter((g) => g.tarjetaId === tarjetaId)
    .toArray()

  const subtotalGastos = gastos.reduce(
    (suma, g) => suma + convertir(g.monto, g.moneda, monedaTarjeta, g.tipoCambioAlMomento ?? tipoCambio),
    0
  )

  // ── 2. Gastos fijos activos ─────────────────────────────────────────────────
  // Se incluyen todos los activos asignados a esta tarjeta.
  // La lógica de recurrencia (bimestral, trimestral…) requiere una fechaInicio
  // en el modelo — se aplicará cuando ese campo se agregue.
  const gastosFijos = await db.gastosFijos
    .filter((g) => g.activo && g.tarjetaId === tarjetaId)
    .toArray()

  const subtotalGastosFijos = gastosFijos.reduce(
    (suma, g) => suma + convertir(g.monto, g.moneda, monedaTarjeta, tipoCambio),
    0
  )

  // ── 3. Cuotas del mes ───────────────────────────────────────────────────────
  // Primero obtengo los IDs de planes de esta tarjeta,
  // luego filtro las cuotasMensuales del periodo.
  const planes = await db.planesCuotas
    .where('tarjetaId')
    .equals(tarjetaId)
    .toArray()

  const planIds = new Set(planes.map((p) => p.id))
  const monedaPorPlan = Object.fromEntries(planes.map((p) => [p.id, p.moneda]))

  const cuotas = await db.cuotasMensuales
    .where('[anio+mes]')
    .equals([anio, mes])
    .filter((c) => planIds.has(c.planCuotasId))
    .toArray()

  const subtotalCuotas = cuotas.reduce(
    (suma, c) => suma + convertir(c.monto, monedaPorPlan[c.planCuotasId] ?? monedaTarjeta, monedaTarjeta, tipoCambio),
    0
  )

  // ── 4. Totales ──────────────────────────────────────────────────────────────
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

/**
 * Calcula el total mensual para todas las tarjetas y devuelve
 * el gran total consolidado en la moneda base indicada.
 */
export async function calcularTotalTodasLasTarjetas(
  periodo: PeriodoMensual,
  tipoCambio: number,
  monedaBase: Moneda
): Promise<{ porTarjeta: TotalMensualTarjeta[]; granTotal: number }> {
  const tarjetas = await db.tarjetas.toArray()

  const porTarjeta = await Promise.all(
    tarjetas.map((t) => calcularTotalMensual(t.id, periodo, tipoCambio))
  )

  const granTotal = porTarjeta.reduce(
    (suma, r) => suma + convertir(r.total, r.moneda, monedaBase, tipoCambio),
    0
  )

  return { porTarjeta, granTotal }
}

// ─── Utilidad de conversión ───────────────────────────────────────────────────

function convertir(
  monto: number,
  de: Moneda,
  a: Moneda,
  tipoCambio: number
): number {
  if (de === a) return monto
  if (de === 'USD' && a === 'CRC') return monto * tipoCambio
  if (de === 'CRC' && a === 'USD') return monto / tipoCambio
  return monto
}
