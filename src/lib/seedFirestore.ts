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
    monedaPreferida: 'CRC',
    color: '#ec4899',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
]

export async function seedFirestoreIfEmpty(): Promise<void> {
  const snap = await getDocs(hCol('usuarios'))

  const { setDoc, updateDoc } = await import('firebase/firestore')

  if (snap.empty) {
    await Promise.all(
      USUARIOS_INICIALES.map((u) =>
        setDoc(hDoc('usuarios', u.id), u as unknown as Record<string, unknown>)
      )
    )
    return
  }

  // Migración: corregir monedaPreferida de user-pareja si quedó en USD
  const pareja = snap.docs.find((d) => d.id === 'user-pareja')
  if (pareja && (pareja.data() as Usuario).monedaPreferida === 'USD') {
    await updateDoc(hDoc('usuarios', 'user-pareja'), { monedaPreferida: 'CRC' })
  }
}
