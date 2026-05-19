import type { ID, FechaISO, FechaHoraISO } from './comunes'
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

// ─── Abono a tarjeta de crédito ───────────────────────────────────────────────

export interface AbonoTarjeta {
  id: ID
  tarjetaId: ID
  /** Usuario que realizó el pago adelantado */
  usuarioId: ID
  /** Período de facturación al que se aplica el abono */
  anio: number
  mes: number
  monto: number
  moneda: Moneda
  /** Fecha en que se realizó el pago (YYYY-MM-DD) */
  fecha: FechaISO
  notas?: string
  creadoEn: FechaHoraISO
}

// ─── Monto manual a pagar (override del calculado) ───────────────────────────

export interface MontoManualTarjeta {
  id: ID         // `${tarjetaId}-${anio}-${mes}`
  tarjetaId: ID
  anio: number
  mes: number
  monto: number
  creadoEn: FechaHoraISO
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
