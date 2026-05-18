import type { Gasto, ID } from '@/types'
import { BaseRepository } from './base.repository'

class GastosRepository extends BaseRepository<Gasto> {
  constructor() { super('gastos') }

  async obtenerPorPeriodo(anio: number, mes: number): Promise<Gasto[]> {
    const prefijo = `${anio}-${String(mes).padStart(2, '0')}`
    const todos = await this.obtenerTodos()
    return todos.filter((g) => g.fecha.startsWith(prefijo))
  }

  actualizar(id: ID, cambios: Partial<Gasto>): Promise<void> {
    return super.actualizar(id, cambios)
  }

  eliminar(id: ID): Promise<void> {
    return super.eliminar(id)
  }
}

export const gastosRepository = new GastosRepository()
