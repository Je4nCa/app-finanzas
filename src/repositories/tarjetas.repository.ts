import type { TarjetaCredito, ID } from '@/types'
import { BaseRepository } from './base.repository'

class TarjetasRepository extends BaseRepository<TarjetaCredito> {
  constructor() { super('tarjetas') }

  obtenerTodas(): Promise<TarjetaCredito[]> {
    return this.obtenerTodos()
  }

  obtenerPorId(id: ID): Promise<TarjetaCredito | undefined> {
    return super.obtenerPorId(id)
  }
}

export const tarjetasRepository = new TarjetasRepository()
