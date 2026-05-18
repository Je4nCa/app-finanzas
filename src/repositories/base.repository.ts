import type { Table, UpdateSpec } from 'dexie'
import type { ID } from '@/types'

/**
 * CRUD base para todas las entidades. Los repositorios concretos
 * extienden esto y añaden consultas específicas de dominio.
 */
export class BaseRepository<T extends { id: ID }> {
  constructor(protected readonly tabla: Table<T>) {}

  obtenerPorId(id: ID): Promise<T | undefined> {
    return this.tabla.get(id)
  }

  obtenerTodos(): Promise<T[]> {
    return this.tabla.toArray()
  }

  async crear(item: T): Promise<void> {
    await this.tabla.add(item)
  }

  async crearBulk(items: T[]): Promise<void> {
    await this.tabla.bulkAdd(items)
  }

  async actualizar(id: ID, cambios: UpdateSpec<T>): Promise<void> {
    await this.tabla.update(id, cambios)
  }

  async eliminar(id: ID): Promise<void> {
    await this.tabla.delete(id)
  }

  contar(): Promise<number> {
    return this.tabla.count()
  }
}
