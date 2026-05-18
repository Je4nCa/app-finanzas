import type { ID, FechaISO, FechaHoraISO } from './comunes'
import type { Moneda } from './moneda'
import type { CategoriaId } from './categoria'

// ─── Tipo de pago ─────────────────────────────────────────────────────────────

export type TipoPago = 'contado' | 'tarjeta' | 'debito'

// ─── Gastos compartidos ───────────────────────────────────────────────────────

export enum TipoGastoCompartido {
  MitadMitad             = 'mitad_mitad',
  PorcentajePersonalizado = 'porcentaje_personalizado',
  UnoPagaTodo            = 'uno_paga_todo',
  MontosFijos            = 'montos_fijos',
}

export interface DetalleCompartido {
  tipo: TipoGastoCompartido
  /** Usado con PorcentajePersonalizado: 0–100 */
  porcentajeMio?: number
  /** Usado con MontosFijos */
  montoFijoMio?: number
  montoFijoOtro?: number
  /** Usado con UnoPagaTodo: ID del usuario que asume el gasto completo */
  usuarioQuePagaId?: ID
}

// ─── Entidad Gasto ────────────────────────────────────────────────────────────

export interface Gasto {
  id: ID
  titulo: string
  monto: number
  moneda: Moneda
  /**
   * Tipo de cambio vigente al momento del gasto.
   * Se almacena por transacción para preservar el histórico.
   */
  tipoCambioAlMomento?: number
  categoriaId: CategoriaId
  tarjetaId?: ID
  usuarioId: ID
  tipoPago: TipoPago
  fecha: FechaISO
  notas?: string
  esCompartido: boolean
  detalleCompartido?: DetalleCompartido
  creadoEn: FechaHoraISO
  actualizadoEn: FechaHoraISO
}

// ─── Gasto Fijo ───────────────────────────────────────────────────────────────

export enum TipoRecurrencia {
  Mensual    = 'mensual',
  Bimestral  = 'bimestral',
  Trimestral = 'trimestral',
  Semestral  = 'semestral',
  Anual      = 'anual',
}

export interface GastoFijo {
  id: ID
  titulo: string
  monto: number
  moneda: Moneda
  recurrencia: TipoRecurrencia
  tarjetaId?: ID
  usuarioId: ID
  categoriaId: CategoriaId
  activo: boolean
  esCompartido: boolean
  detalleCompartido?: DetalleCompartido
  creadoEn: FechaHoraISO
  actualizadoEn: FechaHoraISO
}

// ─── Filtros de consulta ──────────────────────────────────────────────────────

export interface FiltrosGasto {
  tarjetaId?: ID
  usuarioId?: ID
  categoriaId?: CategoriaId
  soloCompartidos?: boolean
  soloFijos?: boolean
  desde?: FechaISO
  hasta?: FechaISO
}
