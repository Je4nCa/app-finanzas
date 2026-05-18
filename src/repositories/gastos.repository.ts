import { db } from '@/database/db'
import type { Gasto, ID } from '@/types'

export const gastosRepository = {
  crear(gasto: Gasto): Promise<ID> {
    return db.gastos.add(gasto)
  },

  obtenerPorId(id: ID): Promise<Gasto | undefined> {
    return db.gastos.get(id)
  },

  obtenerTodos(): Promise<Gasto[]> {
    return db.gastos.toArray()
  },

  obtenerPorPeriodo(anio: number, mes: number): Promise<Gasto[]> {
    const prefijo = `${anio}-${String(mes).padStart(2, '0')}`
    return db.gastos.where('fecha').startsWith(prefijo).toArray()
  },

  actualizar(id: ID, cambios: Partial<Gasto>): Promise<number> {
    return db.gastos.update(id, cambios)
  },

  eliminar(id: ID): Promise<void> {
    return db.gastos.delete(id)
  },
}
