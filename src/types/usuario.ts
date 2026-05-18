import type { ID, FechaHoraISO } from './comunes'
import type { Moneda } from './moneda'

// ─── Entidad Usuario ──────────────────────────────────────────────────────────

export interface Usuario {
  id: ID
  nombre: string
  avatar?: string
  monedaPreferida: Moneda
  /** Color de acento para identificar al usuario en gastos compartidos */
  color: string
  creadoEn: FechaHoraISO
  actualizadoEn: FechaHoraISO
}

// ─── Perfil de pareja (dos usuarios fijos) ────────────────────────────────────

export interface PerfilPareja {
  yo: Usuario
  pareja: Usuario
}
