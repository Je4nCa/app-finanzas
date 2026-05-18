import { getDocs, getDoc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { firestore, hCol, hDoc } from '@/lib/firebase'
import type { ID } from '@/types'

export class BaseRepository<T extends { id: ID }> {
  constructor(protected readonly colName: string) {}

  async obtenerPorId(id: ID): Promise<T | undefined> {
    const snap = await getDoc(hDoc(this.colName, id))
    return snap.exists() ? (snap.data() as T) : undefined
  }

  async obtenerTodos(): Promise<T[]> {
    const snap = await getDocs(hCol(this.colName))
    return snap.docs.map((d) => d.data() as T)
  }

  async crear(item: T): Promise<void> {
    await setDoc(hDoc(this.colName, item.id), item as Record<string, unknown>)
  }

  async crearBulk(items: T[]): Promise<void> {
    const batch = writeBatch(firestore)
    items.forEach((item) =>
      batch.set(hDoc(this.colName, item.id), item as Record<string, unknown>)
    )
    await batch.commit()
  }

  async actualizar(id: ID, cambios: Partial<T>): Promise<void> {
    await updateDoc(hDoc(this.colName, id), cambios as Record<string, unknown>)
  }

  async eliminar(id: ID): Promise<void> {
    await deleteDoc(hDoc(this.colName, id))
  }

  async contar(): Promise<number> {
    const snap = await getDocs(hCol(this.colName))
    return snap.size
  }
}
