import { BaseRepository } from './base.repository'
import type { Salario, ID } from '@/types'

class SalariosRepository extends BaseRepository<Salario> {
  constructor() { super('salarios') }

  async obtenerPorPeriodo(anio: number, mes: number): Promise<Salario[]> {
    const todos = await this.obtenerTodos()
    return todos.filter((s) => s.anio === anio && s.mes === mes)
  }

  async obtenerPorUsuarioYPeriodo(usuarioId: ID, anio: number, mes: number): Promise<Salario[]> {
    const todos = await this.obtenerTodos()
    return todos.filter((s) => s.usuarioId === usuarioId && s.anio === anio && s.mes === mes)
  }
}

export const salariosRepository = new SalariosRepository()
