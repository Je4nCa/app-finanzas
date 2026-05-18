import type { ID, FechaHoraISO } from './comunes'
import type { Moneda } from './moneda'

export interface Salario {
  id: ID
  usuarioId: ID
  monto: number
  moneda: Moneda
  anio: number
  mes: number
  /** 1 = primera quincena, 2 = segunda quincena */
  quincena: 1 | 2
  notas?: string
  creadoEn: FechaHoraISO
}
