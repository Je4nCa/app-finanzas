// ─── Tipo de categoría ────────────────────────────────────────────────────────

export enum TipoCategoria {
  Egreso  = 'egreso',
  Ingreso = 'ingreso',
  Neutro  = 'neutro',
}

// ─── IDs de categoría (unión exhaustiva) ─────────────────────────────────────

export type CategoriaId =
  | 'comida'
  | 'apartamento'
  | 'cafe'
  | 'compras'
  | 'transporte'
  | 'salud'
  | 'entretenimiento'
  | 'suscripciones'
  | 'viajes'
  | 'educacion'
  | 'mascotas'
  | 'otros'

// ─── Entidad Categoría ────────────────────────────────────────────────────────

export interface Categoria {
  id: CategoriaId
  nombre: string
  emoji: string
  color: string
  tipo: TipoCategoria
}
