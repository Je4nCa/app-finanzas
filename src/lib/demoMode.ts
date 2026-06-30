import { doc, setDoc, getDocs, collection } from 'firebase/firestore'
import { firestore } from './firebase'
import { EstadoCuota, TipoGastoCompartido, TipoRecurrencia } from '@/types'
import type { Usuario, TarjetaCredito, Gasto, GastoFijo, PlanCuotas, CuotaMensual, AbonoTarjeta } from '@/types'

export const DEMO_HOUSEHOLD = 'demo'

export const isDemoMode    = () => localStorage.getItem('mamocitos_household') === DEMO_HOUSEHOLD
export const enterDemoMode = () => { localStorage.setItem('mamocitos_household', DEMO_HOUSEHOLD); window.location.reload() }
export const exitDemoMode  = () => {
  localStorage.removeItem('mamocitos_household')
  localStorage.removeItem('usuario-activo') // clear persisted demo user
  window.location.reload()
}

const dDoc = (col: string, id: string) =>
  doc(firestore, 'households', DEMO_HOUSEHOLD, col, id)

const dCol = (col: string) =>
  collection(firestore, 'households', DEMO_HOUSEHOLD, col)

// ─── Demo data ────────────────────────────────────────────────────────────────

const NOW = new Date().toISOString()

const USUARIOS: Usuario[] = [
  { id: 'demo-carlos', nombre: 'Carlos', monedaPreferida: 'USD', color: '#6366f1', creadoEn: NOW, actualizadoEn: NOW },
  { id: 'demo-maria',  nombre: 'Alicia', monedaPreferida: 'CRC', color: '#ec4899', creadoEn: NOW, actualizadoEn: NOW },
]

const TARJETAS: TarjetaCredito[] = [
  {
    id: 'demo-visa', banco: 'BAC', nombre: 'Visa Gold BAC',
    tipo: 'credito', moneda: 'USD', propietarioId: 'demo-carlos',
    color: '#1a56db', diaCierre: 1, diaPago: 30, limite: 3000,
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-mc', banco: 'BCR', nombre: 'Mastercard BCR',
    tipo: 'credito', moneda: 'CRC', propietarioId: 'demo-maria',
    color: '#e02424', diaCierre: 20, diaPago: 5, limite: 600000,
    creadoEn: NOW, actualizadoEn: NOW,
  },
]

// Gastos en Visa Gold (cierre=1): período Jun 2026 = May 2 – Jun 1
// Gastos en Mastercard BCR (cierre=20): período Jun 2026 = May 21 – Jun 20
const GASTOS: Gasto[] = [
  {
    id: 'demo-g1', titulo: 'Supermercado PriceSmart', monto: 67.80, moneda: 'USD',
    categoriaId: 'comida', tarjetaId: 'demo-visa', usuarioId: 'demo-carlos',
    tipoPago: 'tarjeta', fecha: '2026-05-03', esCompartido: false,
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-g2', titulo: 'Almuerzo Restaurante', monto: 28.50, moneda: 'USD',
    categoriaId: 'comida', tarjetaId: 'demo-visa', usuarioId: 'demo-carlos',
    tipoPago: 'tarjeta', fecha: '2026-05-08', esCompartido: true,
    detalleCompartido: { tipo: TipoGastoCompartido.MitadMitad },
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-g3', titulo: 'Ropa Mall San Pedro', monto: 95.00, moneda: 'USD',
    categoriaId: 'compras', tarjetaId: 'demo-visa', usuarioId: 'demo-maria',
    tipoPago: 'tarjeta', fecha: '2026-05-15', esCompartido: false,
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-g4', titulo: 'Farmacia Fischel', monto: 18.75, moneda: 'USD',
    categoriaId: 'salud', tarjetaId: 'demo-visa', usuarioId: 'demo-carlos',
    tipoPago: 'tarjeta', fecha: '2026-05-22', esCompartido: false,
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-g5', titulo: 'Uber Eats', monto: 22.00, moneda: 'USD',
    categoriaId: 'comida', tarjetaId: 'demo-visa', usuarioId: 'demo-carlos',
    tipoPago: 'tarjeta', fecha: '2026-05-27', esCompartido: true,
    detalleCompartido: { tipo: TipoGastoCompartido.MitadMitad },
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-g6', titulo: 'Alquiler de apartamento', monto: 450000, moneda: 'CRC',
    categoriaId: 'apartamento', tarjetaId: 'demo-mc', usuarioId: 'demo-maria',
    tipoPago: 'tarjeta', fecha: '2026-06-01', esCompartido: true,
    detalleCompartido: { tipo: TipoGastoCompartido.MitadMitad },
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-g7', titulo: 'Café Britt', monto: 7500, moneda: 'CRC',
    categoriaId: 'cafe', tarjetaId: 'demo-mc', usuarioId: 'demo-maria',
    tipoPago: 'tarjeta', fecha: '2026-06-03', esCompartido: false,
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-g8', titulo: 'Cinépolis', monto: 15000, moneda: 'CRC',
    categoriaId: 'entretenimiento', tarjetaId: 'demo-mc', usuarioId: 'demo-carlos',
    tipoPago: 'tarjeta', fecha: '2026-06-10', esCompartido: true,
    detalleCompartido: { tipo: TipoGastoCompartido.MitadMitad },
    creadoEn: NOW, actualizadoEn: NOW,
  },
  // Mayo — para que el mes anterior no esté vacío
  {
    id: 'demo-g9', titulo: 'Supermercado Walmart', monto: 54.20, moneda: 'USD',
    categoriaId: 'comida', tarjetaId: 'demo-visa', usuarioId: 'demo-carlos',
    tipoPago: 'tarjeta', fecha: '2026-04-10', esCompartido: false,
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-g10', titulo: 'Zapatos', monto: 79.99, moneda: 'USD',
    categoriaId: 'compras', tarjetaId: 'demo-visa', usuarioId: 'demo-maria',
    tipoPago: 'tarjeta', fecha: '2026-04-18', esCompartido: false,
    creadoEn: NOW, actualizadoEn: NOW,
  },
]

const GASTOS_FIJOS: GastoFijo[] = [
  {
    id: 'demo-fijo-netflix', titulo: 'Netflix', monto: 17.99, moneda: 'USD',
    recurrencia: TipoRecurrencia.Mensual, tarjetaId: 'demo-visa', usuarioId: 'demo-carlos',
    categoriaId: 'suscripciones', activo: true, esCompartido: true,
    detalleCompartido: { tipo: TipoGastoCompartido.MitadMitad },
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-fijo-yt', titulo: 'YouTube Premium', monto: 13.99, moneda: 'USD',
    recurrencia: TipoRecurrencia.Mensual, tarjetaId: 'demo-visa', usuarioId: 'demo-carlos',
    categoriaId: 'suscripciones', activo: true, esCompartido: false,
    creadoEn: NOW, actualizadoEn: NOW,
  },
  {
    id: 'demo-fijo-internet', titulo: 'Internet Kolbi', monto: 29900, moneda: 'CRC',
    recurrencia: TipoRecurrencia.Mensual, tarjetaId: 'demo-mc', usuarioId: 'demo-maria',
    categoriaId: 'apartamento', activo: true, esCompartido: true,
    detalleCompartido: { tipo: TipoGastoCompartido.MitadMitad },
    creadoEn: NOW, actualizadoEn: NOW,
  },
]

// MacBook: 12 cuotas, Ene–Dic 2026
const PLAN_MAC: PlanCuotas = {
  id: 'demo-plan-mac', nombreProducto: 'MacBook Air M3',
  montoTotal: 1499.00, numeroCuotas: 12, montoCuota: 124.92,
  fechaInicio: '2026-01-01', fechaFin: '2026-12-01',
  tarjetaId: 'demo-visa', usuarioId: 'demo-carlos', moneda: 'USD',
  esCompartido: false, creadoEn: NOW,
}

// Smart TV: 24 cuotas, Jun 2025–May 2027
const PLAN_TV: PlanCuotas = {
  id: 'demo-plan-tv', nombreProducto: 'Smart TV 55" LG',
  montoTotal: 259000, numeroCuotas: 24, montoCuota: 10791.67,
  fechaInicio: '2025-06-01', fechaFin: '2027-05-01',
  tarjetaId: 'demo-mc', usuarioId: 'demo-maria', moneda: 'CRC',
  esCompartido: true, detalleCompartido: { tipo: TipoGastoCompartido.MitadMitad }, creadoEn: NOW,
}

function generarCuotas(plan: PlanCuotas): CuotaMensual[] {
  const [inicioAnio, inicioMes] = plan.fechaInicio.split('-').map(Number)
  return Array.from({ length: plan.numeroCuotas }, (_, i) => {
    const totalMeses = inicioMes - 1 + i
    return {
      id: `${plan.id}-c${i + 1}`,
      planCuotasId: plan.id,
      numeroCuota: i + 1,
      mes: (totalMeses % 12) + 1,
      anio: inicioAnio + Math.floor(totalMeses / 12),
      monto: plan.montoCuota,
      estado: EstadoCuota.Pendiente,
    }
  })
}

const ABONOS: AbonoTarjeta[] = [
  {
    id: 'demo-abono-1', tarjetaId: 'demo-visa', usuarioId: 'demo-carlos',
    anio: 2026, mes: 6, monto: 150, moneda: 'USD',
    fecha: '2026-06-15', notas: 'Abono parcial', creadoEn: NOW,
  },
  {
    id: 'demo-abono-2', tarjetaId: 'demo-visa', usuarioId: 'demo-maria',
    anio: 2026, mes: 6, monto: 80, moneda: 'USD',
    fecha: '2026-06-18', notas: 'Mi parte', creadoEn: NOW,
  },
]

// ─── Seeding ──────────────────────────────────────────────────────────────────

function sinUndefined(obj: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

export async function seedDemoHousehold(): Promise<void> {
  // Siempre actualiza los usuarios (para reflejar cambios de nombre)
  await Promise.all(USUARIOS.map(u => setDoc(dDoc('usuarios', u.id), sinUndefined(u))))

  // Solo siembra el resto si es la primera vez
  const snap = await getDocs(dCol('gastos'))
  if (!snap.empty) return

  const writes: Promise<void>[] = []
  for (const t of TARJETAS)      writes.push(setDoc(dDoc('tarjetas', t.id), sinUndefined(t)))
  for (const g of GASTOS)        writes.push(setDoc(dDoc('gastos', g.id), sinUndefined(g)))
  for (const f of GASTOS_FIJOS)  writes.push(setDoc(dDoc('gastosFijos', f.id), sinUndefined(f)))
  for (const a of ABONOS)        writes.push(setDoc(dDoc('abonosTarjeta', a.id), sinUndefined(a)))

  for (const plan of [PLAN_MAC, PLAN_TV]) {
    writes.push(setDoc(dDoc('planesCuotas', plan.id), sinUndefined(plan)))
    for (const c of generarCuotas(plan)) {
      writes.push(setDoc(dDoc('cuotasMensuales', c.id), sinUndefined(c)))
    }
  }

  await Promise.all(writes)
}
