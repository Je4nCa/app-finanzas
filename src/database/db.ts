import Dexie, { type Table } from 'dexie'
import type {
  Usuario,
  TarjetaCredito,
  Gasto,
  GastoFijo,
  PlanCuotas,
  CuotaMensual,
  Categoria,
  Balance,
  TipoCambio,
} from '@/types'

export class FinanzasDB extends Dexie {
  usuarios!:        Table<Usuario>
  tarjetas!:        Table<TarjetaCredito>
  gastos!:          Table<Gasto>
  planesCuotas!:    Table<PlanCuotas>
  cuotasMensuales!: Table<CuotaMensual>
  gastosFijos!:     Table<GastoFijo>
  categorias!:      Table<Categoria>
  balances!:        Table<Balance>
  tiposCambio!:     Table<TipoCambio>

  constructor() {
    super('mamocitos-financieros')

    // v1 — esquema inicial (se mantiene para migraciones correctas)
    this.version(1).stores({
      usuarios:        'id, creadoEn',
      tarjetas:        'id, banco, tipo, moneda, propietarioId, creadoEn',
      gastos:          'id, fecha, categoriaId, tarjetaId, usuarioId, tipoPago, esCompartido, moneda, creadoEn',
      gastosFijos:     'id, categoriaId, tarjetaId, usuarioId, recurrencia, activo, creadoEn',
      planesCuotas:    'id, tarjetaId, usuarioId, moneda, fechaInicio, fechaFin, creadoEn',
      cuotasMensuales: 'id, planCuotasId, [anio+mes], estado',
      balances:        'id, [anio+mes], usuarioId',
      tiposCambio:     'id, fecha',
    })

    // v2 — agrega tabla categorias
    this.version(2).stores({
      usuarios:        'id, creadoEn',
      tarjetas:        'id, banco, tipo, moneda, propietarioId, creadoEn',
      gastos:          'id, fecha, categoriaId, tarjetaId, usuarioId, tipoPago, esCompartido, moneda, creadoEn',
      gastosFijos:     'id, categoriaId, tarjetaId, usuarioId, recurrencia, activo, creadoEn',
      planesCuotas:    'id, tarjetaId, usuarioId, moneda, fechaInicio, fechaFin, creadoEn',
      cuotasMensuales: 'id, planCuotasId, [anio+mes], estado',
      categorias:      'id, tipo',
      balances:        'id, [anio+mes], usuarioId',
      tiposCambio:     'id, fecha',
    })
  }
}

export const db = new FinanzasDB()
