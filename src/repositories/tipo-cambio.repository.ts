import { db } from '@/database/db'
import type { TipoCambio, FechaISO } from '@/types'
import { BaseRepository } from './base.repository'

class TipoCambioRepository extends BaseRepository<TipoCambio> {
  constructor() {
    super(db.tiposCambio)
  }

  obtenerPorFecha(fecha: FechaISO): Promise<TipoCambio | undefined> {
    return this.tabla.where('fecha').equals(fecha).first()
  }

  /** El rate más reciente registrado */
  obtenerUltimo(): Promise<TipoCambio | undefined> {
    return this.tabla.orderBy('fecha').last()
  }

  obtenerHistorico(): Promise<TipoCambio[]> {
    return this.tabla.orderBy('fecha').toArray()
  }
}

export const tipoCambioRepository = new TipoCambioRepository()
