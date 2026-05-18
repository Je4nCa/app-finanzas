import { useMemo } from 'react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import type { TarjetaCredito } from '@/types'

export function useTarjetas() {
  const tarjetas = useCollection<TarjetaCredito>(() => hCol('tarjetas'), [])
  return { tarjetas: tarjetas ?? [] }
}

export function useTarjeta(id: string | undefined) {
  const tarjetas = useCollection<TarjetaCredito>(() => hCol('tarjetas'), [])
  const tarjeta  = useMemo(() => tarjetas?.find((t) => t.id === id), [tarjetas, id])
  return { tarjeta }
}
