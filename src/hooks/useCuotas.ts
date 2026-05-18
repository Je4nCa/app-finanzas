import { useLiveQuery } from 'dexie-react-hooks'
import { planesCuotasRepository, cuotasMensualesRepository } from '@/repositories'

export function useCuotasPorPeriodo(anio: number, mes: number) {
  const cuotas = useLiveQuery(
    () => cuotasMensualesRepository.obtenerPorPeriodo(anio, mes),
    [anio, mes]
  )
  return { cuotas: cuotas ?? [] }
}

export function usePlanCuotas(planId: string | undefined) {
  const plan = useLiveQuery(
    () => (planId ? planesCuotasRepository.obtenerPorId(planId) : undefined),
    [planId]
  )
  const cuotas = useLiveQuery(
    () => (planId ? cuotasMensualesRepository.obtenerPorPlan(planId) : []),
    [planId]
  )
  return { plan, cuotas: cuotas ?? [] }
}

export function useTodosLosPlanes() {
  const planes = useLiveQuery(() => planesCuotasRepository.obtenerTodos(), [])
  return { planes: planes ?? [] }
}
