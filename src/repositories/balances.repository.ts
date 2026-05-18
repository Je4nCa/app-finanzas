import type { Balance, ID } from '@/types'
import { BaseRepository } from './base.repository'

class BalancesRepository extends BaseRepository<Balance> {
  constructor() { super('balances') }

  async obtenerPorPeriodo(anio: number, mes: number): Promise<Balance[]> {
    const todos = await this.obtenerTodos()
    return todos.filter((b) => b.anio === anio && b.mes === mes)
  }

  async obtenerPorUsuarioYPeriodo(usuarioId: ID, anio: number, mes: number): Promise<Balance | undefined> {
    const todos = await this.obtenerTodos()
    return todos.find((b) => b.usuarioId === usuarioId && b.anio === anio && b.mes === mes)
  }

  async obtenerHistoricoPorUsuario(usuarioId: ID): Promise<Balance[]> {
    const todos = await this.obtenerTodos()
    return todos
      .filter((b) => b.usuarioId === usuarioId)
      .sort((a, b) => a.anio - b.anio || a.mes - b.mes)
  }
}

export const balancesRepository = new BalancesRepository()
