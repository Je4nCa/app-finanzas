import { writeBatch } from 'firebase/firestore'
import { firestore, hDoc } from '@/lib/firebase'
import type { PlanCuotas, CuotaMensual, ID } from '@/types'
import { EstadoCuota } from '@/types'
import { BaseRepository } from './base.repository'

class PlanesCuotasRepository extends BaseRepository<PlanCuotas> {
  constructor() { super('planesCuotas') }

  async obtenerPorTarjeta(tarjetaId: ID): Promise<PlanCuotas[]> {
    const todos = await this.obtenerTodos()
    return todos.filter((p) => p.tarjetaId === tarjetaId)
  }

  async obtenerPorUsuario(usuarioId: ID): Promise<PlanCuotas[]> {
    const todos = await this.obtenerTodos()
    return todos.filter((p) => p.usuarioId === usuarioId)
  }
}

class CuotasMensualesRepository extends BaseRepository<CuotaMensual> {
  constructor() { super('cuotasMensuales') }

  async obtenerPorPeriodo(anio: number, mes: number): Promise<CuotaMensual[]> {
    const todos = await this.obtenerTodos()
    return todos.filter((c) => c.anio === anio && c.mes === mes)
  }

  async obtenerPorPlan(planCuotasId: ID): Promise<CuotaMensual[]> {
    const todos = await this.obtenerTodos()
    return todos
      .filter((c) => c.planCuotasId === planCuotasId)
      .sort((a, b) => a.numeroCuota - b.numeroCuota)
  }

  actualizarEstado(id: ID, estado: EstadoCuota): Promise<void> {
    return this.actualizar(id, { estado })
  }

  async obtenerPendientesPorPeriodo(anio: number, mes: number): Promise<CuotaMensual[]> {
    const todos = await this.obtenerTodos()
    return todos.filter(
      (c) => c.anio === anio && c.mes === mes && c.estado === EstadoCuota.Pendiente
    )
  }
}

function sinUndefined<T extends object>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

export async function crearPlanConCuotas(plan: PlanCuotas, cuotas: CuotaMensual[]): Promise<void> {
  const batch = writeBatch(firestore)
  batch.set(hDoc('planesCuotas', plan.id), sinUndefined(plan))
  cuotas.forEach((c) =>
    batch.set(hDoc('cuotasMensuales', c.id), sinUndefined(c))
  )
  await batch.commit()
}

export const planesCuotasRepository   = new PlanesCuotasRepository()
export const cuotasMensualesRepository = new CuotasMensualesRepository()
