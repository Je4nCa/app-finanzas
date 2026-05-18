import { useMemo } from 'react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import type { PlanCuotas, CuotaMensual } from '@/types'

export function useCuotasPorPeriodo(anio: number, mes: number) {
  const todas  = useCollection<CuotaMensual>(() => hCol('cuotasMensuales'), [])
  const cuotas = useMemo(
    () => todas?.filter((c) => c.anio === anio && c.mes === mes) ?? [],
    [todas, anio, mes]
  )
  return { cuotas }
}

export function usePlanCuotas(planId: string | undefined) {
  const planes      = useCollection<PlanCuotas>(() => hCol('planesCuotas'), [])
  const cuotasTodas = useCollection<CuotaMensual>(() => hCol('cuotasMensuales'), [])

  const plan   = useMemo(() => planes?.find((p) => p.id === planId), [planes, planId])
  const cuotas = useMemo(
    () =>
      cuotasTodas
        ?.filter((c) => c.planCuotasId === planId)
        .sort((a, b) => a.numeroCuota - b.numeroCuota) ?? [],
    [cuotasTodas, planId]
  )

  return { plan, cuotas }
}

export function useTodosLosPlanes() {
  const planes = useCollection<PlanCuotas>(() => hCol('planesCuotas'), [])
  return { planes: planes ?? [] }
}
