import { db } from '@/database/db'
import type { TarjetaCredito, ID } from '@/types'

export const tarjetasRepository = {
  crear(tarjeta: TarjetaCredito): Promise<ID> {
    return db.tarjetas.add(tarjeta)
  },

  obtenerPorId(id: ID): Promise<TarjetaCredito | undefined> {
    return db.tarjetas.get(id)
  },

  obtenerTodas(): Promise<TarjetaCredito[]> {
    return db.tarjetas.toArray()
  },

  actualizar(id: ID, cambios: Partial<TarjetaCredito>): Promise<number> {
    return db.tarjetas.update(id, cambios)
  },

  eliminar(id: ID): Promise<void> {
    return db.tarjetas.delete(id)
  },
}
