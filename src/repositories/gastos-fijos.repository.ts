import { db } from '@/database/db'
import type { GastoFijo, ID } from '@/types'
import { BaseRepository } from './base.repository'

class GastosFijosRepository extends BaseRepository<GastoFijo> {
  constructor() {
    super(db.gastosFijos)
  }

  obtenerActivos(): Promise<GastoFijo[]> {
    return this.tabla.where('activo').equals(1).toArray()
  }

  obtenerPorUsuario(usuarioId: ID): Promise<GastoFijo[]> {
    return this.tabla.where('usuarioId').equals(usuarioId).toArray()
  }

  obtenerActivosPorUsuario(usuarioId: ID): Promise<GastoFijo[]> {
    return this.tabla
      .where('usuarioId')
      .equals(usuarioId)
      .filter((g) => g.activo)
      .toArray()
  }
}

export const gastosFijosRepository = new GastosFijosRepository()
