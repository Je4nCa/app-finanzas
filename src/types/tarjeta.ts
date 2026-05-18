import type { ID, FechaHoraISO } from './comunes'
import type { Moneda } from './moneda'

// ─── Tipo de tarjeta ──────────────────────────────────────────────────────────

export type TipoTarjeta = 'credito' | 'debito'

// ─── Entidad TarjetaCredito ───────────────────────────────────────────────────

export interface TarjetaCredito {
  id: ID
  banco: string
  nombre: string
  tipo: TipoTarjeta
  moneda: Moneda
  propietarioId: ID
  color: string
  creadoEn: FechaHoraISO
  actualizadoEn: FechaHoraISO
  /** Solo crédito: límite de la tarjeta */
  limite?: number
  /** Solo crédito: día de cierre del estado de cuenta (1–31) */
  diaCierre?: number
  /** Solo crédito: día de vencimiento del pago mínimo (1–31) */
  diaPago?: number
  /** Solo débito: saldo inicial (base para calcular el disponible) */
  saldoInicial?: number
}

// ─── Resumen de estado de una tarjeta en un mes ───────────────────────────────

export interface EstadoTarjetaMes {
  tarjetaId: ID
  totalCargado: number
  limiteRestante?: number
  moneda: Moneda
  proximaFechaCierre: string
  proximaFechaPago: string
}
