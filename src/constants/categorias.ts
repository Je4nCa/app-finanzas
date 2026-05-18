import { TipoCategoria } from '@/types/categoria'
import type { Categoria } from '@/types/categoria'

export const CATEGORIAS: Categoria[] = [
  { id: 'comida',          nombre: 'Comida',          emoji: '🍔', color: '#f97316', tipo: TipoCategoria.Egreso },
  { id: 'apartamento',     nombre: 'Apartamento',     emoji: '🏠', color: '#6366f1', tipo: TipoCategoria.Egreso },
  { id: 'cafe',            nombre: 'Café',            emoji: '☕', color: '#92400e', tipo: TipoCategoria.Egreso },
  { id: 'compras',         nombre: 'Compras',         emoji: '🛍️', color: '#ec4899', tipo: TipoCategoria.Egreso },
  { id: 'transporte',      nombre: 'Transporte',      emoji: '🚗', color: '#3b82f6', tipo: TipoCategoria.Egreso },
  { id: 'salud',           nombre: 'Salud',           emoji: '💊', color: '#10b981', tipo: TipoCategoria.Egreso },
  { id: 'entretenimiento', nombre: 'Entretenimiento', emoji: '🎬', color: '#8b5cf6', tipo: TipoCategoria.Egreso },
  { id: 'suscripciones',   nombre: 'Suscripciones',   emoji: '📱', color: '#06b6d4', tipo: TipoCategoria.Egreso },
  { id: 'viajes',          nombre: 'Viajes',          emoji: '✈️', color: '#f59e0b', tipo: TipoCategoria.Egreso },
  { id: 'educacion',       nombre: 'Educación',       emoji: '📚', color: '#84cc16', tipo: TipoCategoria.Egreso },
  { id: 'mascotas',        nombre: 'Mascotas',        emoji: '🐾', color: '#f472b6', tipo: TipoCategoria.Egreso },
  { id: 'otros',           nombre: 'Otros',           emoji: '📦', color: '#6b7280', tipo: TipoCategoria.Neutro },
]

export const CATEGORIA_MAP = Object.fromEntries(
  CATEGORIAS.map((c) => [c.id, c])
) as Record<string, Categoria>
