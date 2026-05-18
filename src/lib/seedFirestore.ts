import { getDocs } from 'firebase/firestore'
import { hCol, hDoc } from './firebase'
import type { Usuario } from '@/types'

const USUARIOS_INICIALES: Usuario[] = [
  {
    id: 'user-yo',
    nombre: 'Mamocito',
    monedaPreferida: 'USD',
    color: '#6366f1',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
  {
    id: 'user-pareja',
    nombre: 'Mamocita',
    monedaPreferida: 'USD',
    color: '#ec4899',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
]

export async function seedFirestoreIfEmpty(): Promise<void> {
  const snap = await getDocs(hCol('usuarios'))
  if (!snap.empty) return

  const { setDoc } = await import('firebase/firestore')
  await Promise.all(
    USUARIOS_INICIALES.map((u) =>
      setDoc(hDoc('usuarios', u.id), u as unknown as Record<string, unknown>)
    )
  )
}
