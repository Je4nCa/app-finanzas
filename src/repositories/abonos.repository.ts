import { BaseRepository } from './base.repository'
import type { AbonoTarjeta, ID } from '@/types'

class AbonosTarjetaRepository extends BaseRepository<AbonoTarjeta> {
  constructor() { super('abonosTarjeta') }

  async obtenerPorTarjetaYPeriodo(tarjetaId: ID, anio: number, mes: number): Promise<AbonoTarjeta[]> {
    const todos = await this.obtenerTodos()
    return todos.filter((a) => a.tarjetaId === tarjetaId && a.anio === anio && a.mes === mes)
  }
}

export const abonosTarjetaRepository = new AbonosTarjetaRepository()
