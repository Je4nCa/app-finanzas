import { useLiveQuery } from 'dexie-react-hooks'
import { tarjetasRepository } from '@/repositories'

export function useTarjetas() {
  const tarjetas = useLiveQuery(() => tarjetasRepository.obtenerTodas(), [])
  return { tarjetas: tarjetas ?? [] }
}

export function useTarjeta(id: string | undefined) {
  const tarjeta = useLiveQuery(
    () => (id ? tarjetasRepository.obtenerPorId(id) : undefined),
    [id]
  )
  return { tarjeta }
}
