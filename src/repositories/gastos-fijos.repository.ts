import type { GastoFijo, ID } from '@/types'
import { BaseRepository } from './base.repository'

class GastosFijosRepository extends BaseRepository<GastoFijo> {
  constructor() { super('gastosFijos') }

  async obtenerActivos(): Promise<GastoFijo[]> {
    const todos = await this.obtenerTodos()
    return todos.filter((g) => g.activo)
  }

  async obtenerPorUsuario(usuarioId: ID): Promise<GastoFijo[]> {
    const todos = await this.obtenerTodos()
    return todos.filter((g) => g.usuarioId === usuarioId)
  }

  async obtenerActivosPorUsuario(usuarioId: ID): Promise<GastoFijo[]> {
    const todos = await this.obtenerTodos()
    return todos.filter((g) => g.activo && g.usuarioId === usuarioId)
  }
}

export const gastosFijosRepository = new GastosFijosRepository()
