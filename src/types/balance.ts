import type { ID } from './comunes'
import type { Moneda } from './moneda'

// ─── Balance mensual por usuario ──────────────────────────────────────────────

export interface Balance {
  id: ID
  mes: number  // 1–12
  anio: number
  usuarioId: ID
  montoPorPagar: number
  montoPagado: number
}

// ─── Balance calculado (derivado, no persiste) ────────────────────────────────

export interface BalanceCalculado extends Balance {
  saldoPendiente: number // montoPorPagar - montoPagado
  moneda: Moneda
  estaSaldado: boolean
}

// ─── Balance de pareja (comparativo) ─────────────────────────────────────────

export interface BalancePareja {
  mes: number
  anio: number
  moneda: Moneda
  totalGastadoYo: number
  totalGastadoPareja: number
  diferencia: number
  /** Positivo: mi pareja me debe. Negativo: yo le debo. */
  saldoNeto: number
}
