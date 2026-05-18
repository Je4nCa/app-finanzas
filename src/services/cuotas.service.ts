import { db } from '@/database/db'
import { EstadoCuota } from '@/types'
import type { PlanCuotas, CuotaMensual, ID } from '@/types'

/**
 * Genera N registros CuotaMensual a partir de un PlanCuotas.
 * Las cuotas avanzan mes a mes desde fechaInicio.
 */
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

/** Elimina el plan y todas sus cuotas en una sola transacción. */
export async function eliminarPlanConCuotas(planId: ID): Promise<void> {
  await db.transaction('rw', db.planesCuotas, db.cuotasMensuales, async () => {
    await db.cuotasMensuales.where('planCuotasId').equals(planId).delete()
    await db.planesCuotas.delete(planId)
  })
}

/** Devuelve el estado efectivo de una cuota — marca como vencida si el mes ya pasó. */
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
