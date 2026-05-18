import type { ID } from './comunes'
import type { PeriodoMensual } from './comunes'
import type { Moneda } from './moneda'
import type { CategoriaId } from './categoria'
import type { TarjetaCredito } from './tarjeta'
import type { Gasto, GastoFijo } from './gasto'
import type { CuotaMensual } from './cuotas'
import type { Balance } from './balance'

// ─── Saldo por tarjeta en un mes ──────────────────────────────────────────────

export interface SaldoTarjeta {
  tarjetaId: ID
  totalMes: number
  moneda: Moneda
  limiteRestante?: number
}

// ─── Resumen mensual agregado ─────────────────────────────────────────────────

export interface ResumenMensual {
  periodo: PeriodoMensual
  moneda: Moneda
  totalGastos: number
  totalGastosFijos: number
  totalGastosVariables: number
  totalCuotas: number
  totalCompartidos: number
  /** Total consolidado en moneda base */
  granTotal: number
}

// ─── Desglose por categoría ───────────────────────────────────────────────────

export interface ResumenCategoria {
  categoriaId: CategoriaId
  total: number
  porcentaje: number
  cantidadTransacciones: number
}

// ─── Resumen por tarjeta ──────────────────────────────────────────────────────

export interface ResumenTarjeta {
  tarjeta: TarjetaCredito
  totalMes: number
  moneda: Moneda
  cuotas: CuotaMensual[]
  gastos: Gasto[]
  gastosFijos: GastoFijo[]
}

// ─── LedgerMensual — corazón de la aplicación ────────────────────────────────
/**
 * Agrega todo lo que ocurrió en un mes:
 * cuotas generadas + gastos fijos + gastos variables + balances de tarjeta.
 * Es la fuente de verdad para dashboards y reportes.
 */
export interface LedgerMensual {
  periodo: PeriodoMensual
  resumen: ResumenMensual
  gastos: Gasto[]
  cuotasMensuales: CuotaMensual[]
  gastosFijos: GastoFijo[]
  saldosPorTarjeta: SaldoTarjeta[]
  resumenPorCategoria: ResumenCategoria[]
  balances: Balance[]
}

// ─── Filtros para consultas del ledger ───────────────────────────────────────

export interface FiltrosLedger {
  periodo: PeriodoMensual
  tarjetaId?: ID
  usuarioId?: ID
  categoriaId?: CategoriaId
  soloCompartidos?: boolean
}
