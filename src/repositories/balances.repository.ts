import { db } from '@/database/db'
import type { Balance, ID } from '@/types'
import { BaseRepository } from './base.repository'

class BalancesRepository extends BaseRepository<Balance> {
  constructor() {
    super(db.balances)
  }

  obtenerPorPeriodo(anio: number, mes: number): Promise<Balance[]> {
    return this.tabla.where('[anio+mes]').equals([anio, mes]).toArray()
  }

  obtenerPorUsuarioYPeriodo(
    usuarioId: ID,
    anio: number,
    mes: number
  ): Promise<Balance | undefined> {
    return this.tabla
      .where('[anio+mes]')
      .equals([anio, mes])
      .filter((b) => b.usuarioId === usuarioId)
      .first()
  }

  obtenerHistoricoPorUsuario(usuarioId: ID): Promise<Balance[]> {
    return this.tabla
      .where('usuarioId')
      .equals(usuarioId)
      .sortBy('anio')
  }
}

export const balancesRepository = new BalancesRepository()
