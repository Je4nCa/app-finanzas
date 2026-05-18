import { db } from '@/database/db'
import type { Usuario } from '@/types'
import { BaseRepository } from './base.repository'

class UsuariosRepository extends BaseRepository<Usuario> {
  constructor() {
    super(db.usuarios)
  }

  /** Devuelve los dos perfiles (yo + pareja) ordenados por fecha de creación */
  obtenerPareja(): Promise<Usuario[]> {
    return this.tabla.orderBy('creadoEn').toArray()
  }

  obtenerPorId(id: string): Promise<Usuario | undefined> {
    return this.tabla.get(id)
  }
}

export const usuariosRepository = new UsuariosRepository()
