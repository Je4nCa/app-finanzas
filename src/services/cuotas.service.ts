import { writeBatch } from 'firebase/firestore'
import { firestore, hDoc } from '@/lib/firebase'
import { cuotasMensualesRepository } from '@/repositories'
import { EstadoCuota } from '@/types'
import type { PlanCuotas, CuotaMensual, ID } from '@/types'

export function generarCuotas(plan: PlanCuotas): CuotaMensual[] {
  const [anioInicio, mesInicio] = plan.fechaInicio.split('-').map(Number)
  const cuotas: CuotaMensual[] = []

  for (let i = 0; i < plan.numeroCuotas; i++) {
    const totalMeses = mesInicio - 1 + i
    const anio = anioInicio + Math.floor(totalMeses / 12)
    const mes  = (totalMeses % 12) + 1
    cuotas.push({
      id:           crypto.randomUUID(),
      planCuotasId: plan.id,
      numeroCuota:  i + 1,
      mes,
      anio,
      monto:  plan.montoCuota,
      estado: EstadoCuota.Pendiente,
    })
  }

  return cuotas
}

export async function eliminarPlanConCuotas(planId: ID): Promise<void> {
  const cuotas = await cuotasMensualesRepository.obtenerPorPlan(planId)
  const batch  = writeBatch(firestore)
  cuotas.forEach((c) => batch.delete(hDoc('cuotasMensuales', c.id)))
  batch.delete(hDoc('planesCuotas', planId))
  await batch.commit()
}

export function estadoEfectivo(cuota: CuotaMensual): EstadoCuota {
  if (cuota.estado !== EstadoCuota.Pendiente) return cuota.estado
  const hoy = new Date()
  const esPasada =
    cuota.anio < hoy.getFullYear() ||
    (cuota.anio === hoy.getFullYear() && cuota.mes < hoy.getMonth() + 1)
  return esPasada ? EstadoCuota.Vencida : EstadoCuota.Pendiente
}

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
export function labelMes(mes: number, anio: number) {
  return `${MESES_CORTO[mes - 1]} ${anio}`
}
