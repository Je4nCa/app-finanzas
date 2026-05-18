import type { Usuario } from '@/types'
import { BaseRepository } from './base.repository'

class UsuariosRepository extends BaseRepository<Usuario> {
  constructor() { super('usuarios') }

  async obtenerPareja(): Promise<Usuario[]> {
    const todos = await this.obtenerTodos()
    return todos.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  }

  obtenerPorId(id: string): Promise<Usuario | undefined> {
    return super.obtenerPorId(id)
  }
}

export const usuariosRepository = new UsuariosRepository()
