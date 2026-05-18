import { db } from './db'
import type { Usuario, TarjetaCredito, TipoCambio } from '@/types'

const USUARIOS_SEED: Usuario[] = [
  {
    id: 'user-yo',
    nombre: 'Mamocito',
    monedaPreferida: 'USD',
    color: '#6366f1',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
  {
    id: 'user-pareja',
    nombre: 'Mamocita',
    monedaPreferida: 'USD',
    color: '#ec4899',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
]

const TARJETAS_SEED: TarjetaCredito[] = [
  {
    id: 'tarjeta-bac-usd',
    banco: 'BAC',
    nombre: 'Visa USD',
    tipo: 'credito',
    moneda: 'USD',
    limite: 5000,
    diaCierre: 15,
    diaPago: 5,
    propietarioId: 'user-yo',
    color: '#6366f1',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
  {
    id: 'tarjeta-bac-crc',
    banco: 'BAC',
    nombre: 'Visa CRC',
    tipo: 'credito',
    moneda: 'CRC',
    limite: 2000000,
    diaCierre: 15,
    diaPago: 5,
    propietarioId: 'user-yo',
    color: '#10b981',
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString(),
  },
]

const TIPO_CAMBIO_SEED: TipoCambio = {
  id: 'tc-inicial',
  usdACrc: 520,
  fecha: new Date().toISOString().slice(0, 10),
}

/**
 * Pobla la BD con datos mínimos si está vacía.
 * Solo corre en desarrollo y no sobreescribe datos existentes.
 */
export async function seedDatabase(): Promise<void> {
  const hayUsuarios = (await db.usuarios.count()) > 0
  if (hayUsuarios) return

  await db.transaction('rw', db.usuarios, db.tarjetas, db.tiposCambio, async () => {
    await db.usuarios.bulkAdd(USUARIOS_SEED)
    await db.tarjetas.bulkAdd(TARJETAS_SEED)
    await db.tiposCambio.add(TIPO_CAMBIO_SEED)
  })
}
