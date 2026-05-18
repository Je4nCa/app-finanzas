import type { ID, FechaISO } from './comunes'

// ─── Moneda ──────────────────────────────────────────────────────────────────

export type Moneda = 'USD' | 'CRC'

// ─── Tipo de cambio histórico ─────────────────────────────────────────────────

export interface TipoCambio {
  id: ID
  usdACrc: number
  fecha: FechaISO
}

/** Tasas de ventanilla de ARI Casa de Cambio — leídas de Firestore */
export interface TipoCambioARI {
  compra: number              // ARI compra USD — usado para CRC → USD
  venta:  number              // ARI vende USD — usado para USD → CRC
  fuente: string
  fechaActualizacion: string
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
