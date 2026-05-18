// ─── Primitivos base ─────────────────────────────────────────────────────────

/** UUID string — identificador único de entidad */
export type ID = string

/** Fecha en formato YYYY-MM-DD */
export type FechaISO = string

/** Fecha + hora en formato ISO 8601 */
export type FechaHoraISO = string

// ─── Periodo ─────────────────────────────────────────────────────────────────

export interface PeriodoMensual {
  anio: number
  mes: number // 1–12
}

// ─── Estado de carga (stores) ─────────────────────────────────────────────────

export interface EstadoCarga {
  cargando: boolean
  error: string | null
}

// ─── Paginación ───────────────────────────────────────────────────────────────

export interface Paginacion {
  pagina: number
  porPagina: number
  total: number
}

// ─── Resultado genérico de operaciones ────────────────────────────────────────

export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; error: string }
