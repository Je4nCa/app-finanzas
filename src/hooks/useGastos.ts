import { useMemo } from 'react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import type { Gasto, GastoFijo } from '@/types'

export function useGastosPorPeriodo(anio: number, mes: number) {
  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`
  const todos   = useCollection<Gasto>(() => hCol('gastos'), [])
  const gastos  = useMemo(
    () => todos?.filter((g) => g.fecha.startsWith(prefijo)) ?? [],
    [todos, prefijo]
  )
  return { gastos }
}

export function useGastosFijos() {
  const todos      = useCollection<GastoFijo>(() => hCol('gastosFijos'), [])
  const gastosFijos = useMemo(() => todos?.filter((g) => g.activo) ?? [], [todos])
  return { gastosFijos }
}
