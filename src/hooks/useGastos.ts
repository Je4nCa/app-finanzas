import { useLiveQuery } from 'dexie-react-hooks'
import { gastosRepository, gastosFijosRepository } from '@/repositories'

export function useGastosPorPeriodo(anio: number, mes: number) {
  const gastos = useLiveQuery(
    () => gastosRepository.obtenerPorPeriodo(anio, mes),
    [anio, mes]
  )
  return { gastos: gastos ?? [] }
}

export function useGastosFijos() {
  const gastosFijos = useLiveQuery(() => gastosFijosRepository.obtenerActivos(), [])
  return { gastosFijos: gastosFijos ?? [] }
}
