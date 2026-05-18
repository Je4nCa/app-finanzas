import type { ID, FechaISO } from './comunes'

// ─── Moneda ──────────────────────────────────────────────────────────────────

export type Moneda = 'USD' | 'CRC'

// ─── Tipo de cambio histórico ─────────────────────────────────────────────────

export interface TipoCambio {
  id: ID
  usdACrc: number
  fecha: FechaISO
}

// ─── Monto con contexto de conversión ────────────────────────────────────────
/** Snapshot del resultado de una conversión — se almacena por transacción */
export interface MontoConvertido {
  montoOriginal: number
  monedaOriginal: Moneda
  montoConvertido: number
  monedaDestino: Moneda
  tipoCambioUsado: number
}
