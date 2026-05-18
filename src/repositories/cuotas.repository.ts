import { db } from '@/database/db'
import type { PlanCuotas, CuotaMensual, ID } from '@/types'
import { EstadoCuota } from '@/types'
import { BaseRepository } from './base.repository'

class PlanesCuotasRepository extends BaseRepository<PlanCuotas> {
  constructor() {
    super(db.planesCuotas)
  }

  obtenerPorTarjeta(tarjetaId: ID): Promise<PlanCuotas[]> {
    return this.tabla.where('tarjetaId').equals(tarjetaId).toArray()
  }

  obtenerPorUsuario(usuarioId: ID): Promise<PlanCuotas[]> {
    return this.tabla.where('usuarioId').equals(usuarioId).toArray()
  }
}

class CuotasMensualesRepository extends BaseRepository<CuotaMensual> {
  constructor() {
    super(db.cuotasMensuales)
  }

  /** Cuotas activas para un mes — las que aparecen en dashboards y totales de tarjeta */
  obtenerPorPeriodo(anio: number, mes: number): Promise<CuotaMensual[]> {
    return this.tabla.where('[anio+mes]').equals([anio, mes]).toArray()
  }

  obtenerPorPlan(planCuotasId: ID): Promise<CuotaMensual[]> {
    return this.tabla
      .where('planCuotasId')
      .equals(planCuotasId)
      .sortBy('numeroCuota')
  }

  actualizarEstado(id: ID, estado: EstadoCuota): Promise<void> {
    return this.actualizar(id, { estado })
  }

  obtenerPendientesPorPeriodo(anio: number, mes: number): Promise<CuotaMensual[]> {
    return this.tabla
      .where('[anio+mes]')
      .equals([anio, mes])
      .filter((c) => c.estado === EstadoCuota.Pendiente)
      .toArray()
  }
}

/**
 * Crea un PlanCuotas junto con todas sus CuotaMensual en una sola transacción.
 * Las cuotas se generan automáticamente mes a mes desde fechaInicio.
 */
async function crearPlanConCuotas(
  plan: PlanCuotas,
  cuotas: CuotaMensual[]
): Promise<void> {
  await db.transaction('rw', db.planesCuotas, db.cuotasMensuales, async () => {
    await db.planesCuotas.add(plan)
    await db.cuotasMensuales.bulkAdd(cuotas)
  })
}

export const planesCuotasRepository = new PlanesCuotasRepository()
export const cuotasMensualesRepository = new CuotasMensualesRepository()
export { crearPlanConCuotas }
