import { BaseRepository } from './base.repository'
import type { MontoManualTarjeta, ID } from '@/types'

class MontosManualesRepository extends BaseRepository<MontoManualTarjeta> {
  constructor() { super('montosManualesTarjeta') }

  idPara(tarjetaId: ID, anio: number, mes: number): string {
    return `${tarjetaId}-${anio}-${mes}`
  }
}

export const montosManualesRepository = new MontosManualesRepository()
