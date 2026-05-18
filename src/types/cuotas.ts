import type { ID, FechaISO, FechaHoraISO } from './comunes'
import type { Moneda } from './moneda'
import type { DetalleCompartido } from './gasto'

// ─── Estado de una cuota individual ──────────────────────────────────────────

export enum EstadoCuota {
  Pendiente = 'pendiente',
  Pagada    = 'pagada',
  Vencida   = 'vencida',
}

// ─── Plan de cuotas (registro maestro) ───────────────────────────────────────
/**
 * Representa una compra a tasa cero.
 * Al crearse, genera automáticamente N registros CuotaMensual — uno por mes.
 */
export interface PlanCuotas {
  id: ID
  nombreProducto: string
  montoTotal: number
  numeroCuotas: number
  /** Pre-calculado: montoTotal / numeroCuotas */
  montoCuota: number
  /** Mes y año de la primera cuota */
  fechaInicio: FechaISO
  /** Mes y año de la última cuota (calculado al crear) */
  fechaFin: FechaISO
  tarjetaId: ID
  /** Fecha real de la compra (YYYY-MM-DD), usada para calcular el primer mes de cobro */
  fechaCompra?: string
  usuarioId: ID
  moneda: Moneda
  esCompartido: boolean
  detalleCompartido?: DetalleCompartido
  creadoEn: FechaHoraISO
}

// ─── Cuota mensual (entrada real generada) ────────────────────────────────────
/**
 * Entrada independiente por cada mes del plan.
 * Aparece en reportes, dashboards y totales de tarjeta.
 * Desaparece del ledger activo una vez que el plan finaliza.
 */
export interface CuotaMensual {
  id: ID
  planCuotasId: ID
  numeroCuota: number // 1 … numeroCuotas
  mes: number         // 1–12
  anio: number
  monto: number
  estado: EstadoCuota
}

// ─── Vista enriquecida (solo lectura) ─────────────────────────────────────────

export interface CuotaMensualDetalle extends CuotaMensual {
  nombreProducto: string
  tarjetaId: ID
  moneda: Moneda
  progresoTexto: string // ej. "3 / 24"
}
