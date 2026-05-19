import * as XLSX from 'xlsx'
import { calcularPartes } from '@/services/compartido.service'
import { periodoFacturacion } from '@/lib/billingCycle'
import type {
  Usuario, Gasto, GastoFijo, PlanCuotas, CuotaMensual, TarjetaCredito, AbonoTarjeta,
} from '@/types'

interface DatosReporte {
  periodo: { anio: number; mes: number }
  usuarios: Usuario[]
  gastos: Gasto[]
  gastosFijos: GastoFijo[]
  planesCuotas: PlanCuotas[]
  cuotasMensuales: CuotaMensual[]
  tarjetas: TarjetaCredito[]
  abonos: AbonoTarjeta[]
  tipoCambio: number
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function nombreTarjeta(tarjetaId: string | undefined, tarjetas: TarjetaCredito[]): string {
  if (!tarjetaId) return 'Efectivo'
  return tarjetas.find((t) => t.id === tarjetaId)?.nombre ?? tarjetaId
}

function montoParaUsuario(monto: number, usuarioId: string, pagadorId: string, esCompartido: boolean, detalle: Gasto['detalleCompartido']): number {
  if (!esCompartido || !detalle) {
    return pagadorId === usuarioId ? monto : 0
  }
  const partes = calcularPartes(monto, detalle)
  return pagadorId === usuarioId ? partes.montoPagador : partes.montoOtro
}

function agregarHojaUsuario(
  wb: XLSX.WorkBook,
  usuario: Usuario,
  datos: DatosReporte,
): void {
  const { periodo, gastos, gastosFijos, planesCuotas, cuotasMensuales, tarjetas, abonos, tipoCambio } = datos
  const otroUsuario = datos.usuarios.find((u) => u.id !== usuario.id)
  const simbolo = usuario.monedaPreferida === 'USD' ? '$' : '₡'
  const label = `${MESES[periodo.mes - 1]} ${periodo.anio}`
  const prefijo = `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`

  // Build billing-period map per card (same logic as Dashboard/Tarjetas)
  const diaCierrePorTarjeta = new Map<string, number>()
  tarjetas.forEach((t) => {
    if (t.tipo === 'credito' && t.diaCierre) diaCierrePorTarjeta.set(t.id, t.diaCierre)
  })

  function conv(monto: number, moneda: string): number {
    if (moneda === usuario.monedaPreferida) return monto
    if (moneda === 'USD') return monto * tipoCambio
    return monto / tipoCambio
  }

  const rows: (string | number)[][] = []

  const h = (text: string) => [text]
  const sep = () => ['']

  // ── Title ──
  rows.push([`Reporte ${label} — ${usuario.nombre}`])
  rows.push([`Moneda: ${usuario.monedaPreferida} · TC venta: ₡${tipoCambio.toLocaleString()}`])
  rows.push(sep())

  // ── Gastos Variables ──
  rows.push(h('GASTOS VARIABLES'))
  rows.push(['Fecha', 'Concepto', 'Categoría', 'Tarjeta', 'Moneda orig.', 'Monto total', `Mi parte (${usuario.monedaPreferida})`, 'Compartido', 'Split'])

  // Filter by billing period per card, or calendar month for cash/debit
  const gastosDelMes = gastos.filter((g) => {
    const diaCierre = g.tarjetaId ? diaCierrePorTarjeta.get(g.tarjetaId) : undefined
    if (diaCierre) {
      const { desde, hasta } = periodoFacturacion(periodo.anio, periodo.mes, diaCierre)
      return g.fecha >= desde && g.fecha <= hasta
    }
    return g.fecha.startsWith(prefijo)
  })
  let subtotalVar = 0
  for (const g of gastosDelMes) {
    const esMio = g.usuarioId === usuario.id
    const afectaMe = esMio || (g.esCompartido && g.usuarioId !== usuario.id)
    if (!afectaMe) continue

    const miParte = montoParaUsuario(g.monto, usuario.id, g.usuarioId, g.esCompartido, g.detalleCompartido)
    const miParteConv = conv(miParte, g.moneda)
    subtotalVar += miParteConv

    const split = g.esCompartido && g.detalleCompartido
      ? `${calcularPartes(100, g.detalleCompartido).montoPagador.toFixed(0)}/${calcularPartes(100, g.detalleCompartido).montoOtro.toFixed(0)}`
      : '—'
    const pagador = esMio ? 'Yo pagué' : `Pagó ${otroUsuario?.nombre ?? '?'}`

    rows.push([
      g.fecha,
      g.titulo,
      g.categoriaId,
      nombreTarjeta(g.tarjetaId, tarjetas),
      g.moneda,
      g.monto,
      +miParteConv.toFixed(2),
      g.esCompartido ? pagador : 'No',
      g.esCompartido ? split : '—',
    ])
  }
  rows.push(['', '', '', '', '', 'Subtotal', +subtotalVar.toFixed(2)])
  rows.push(sep())

  // ── Tasa Cero / Cuotas ──
  rows.push(h('TASA CERO / CUOTAS'))
  rows.push(['Producto', 'Tarjeta', 'Cuota #', 'Cuotas totales', 'Moneda orig.', 'Monto cuota', `Mi parte (${usuario.monedaPreferida})`, 'Compartido'])

  let subtotalCuotas = 0
  const cuotasMes = cuotasMensuales.filter((c) => c.anio === periodo.anio && c.mes === periodo.mes)
  for (const cuota of cuotasMes) {
    const plan = planesCuotas.find((p) => p.id === cuota.planCuotasId)
    if (!plan) continue

    const esMio = plan.usuarioId === usuario.id
    const afectaMe = esMio || (plan.esCompartido && plan.usuarioId !== usuario.id)
    if (!afectaMe) continue

    const miParte = montoParaUsuario(cuota.monto, usuario.id, plan.usuarioId, plan.esCompartido, plan.detalleCompartido)
    const miParteConv = conv(miParte, plan.moneda)
    subtotalCuotas += miParteConv

    rows.push([
      plan.nombreProducto,
      nombreTarjeta(plan.tarjetaId, tarjetas),
      cuota.numeroCuota,
      plan.numeroCuotas,
      plan.moneda,
      cuota.monto,
      +miParteConv.toFixed(2),
      plan.esCompartido ? (esMio ? 'Yo pagué' : `Pagó ${otroUsuario?.nombre ?? '?'}`) : 'No',
    ])
  }
  rows.push(['', '', '', '', '', 'Subtotal', +subtotalCuotas.toFixed(2)])
  rows.push(sep())

  // ── Gastos Fijos ──
  rows.push(h('GASTOS FIJOS (ACTIVOS)')  )
  rows.push(['Concepto', 'Tarjeta', 'Moneda orig.', 'Monto total', `Mi parte (${usuario.monedaPreferida})`, 'Recurrencia', 'Compartido'])

  let subtotalFijos = 0
  for (const fijo of gastosFijos.filter((f) => f.activo)) {
    const esMio = fijo.usuarioId === usuario.id
    const afectaMe = esMio || (fijo.esCompartido && fijo.usuarioId !== usuario.id)
    if (!afectaMe) continue

    const miParte = montoParaUsuario(fijo.monto, usuario.id, fijo.usuarioId, fijo.esCompartido, fijo.detalleCompartido)
    const miParteConv = conv(miParte, fijo.moneda)
    subtotalFijos += miParteConv

    rows.push([
      fijo.titulo,
      nombreTarjeta(fijo.tarjetaId, tarjetas),
      fijo.moneda,
      fijo.monto,
      +miParteConv.toFixed(2),
      fijo.recurrencia,
      fijo.esCompartido ? (esMio ? 'Yo pagué' : `Pagó ${otroUsuario?.nombre ?? '?'}`) : 'No',
    ])
  }
  rows.push(['', '', '', 'Subtotal', +subtotalFijos.toFixed(2)])
  rows.push(sep())

  // ── Adelantos de pago ──
  const abonosPeriodo = abonos.filter(
    (a) => a.usuarioId === usuario.id && a.anio === periodo.anio && a.mes === periodo.mes
  )
  let subtotalAbonos = 0
  if (abonosPeriodo.length > 0) {
    rows.push(h('ADELANTOS DE PAGO'))
    rows.push(['Fecha', 'Tarjeta', 'Moneda', 'Monto pagado', `En ${usuario.monedaPreferida}`, 'Notas'])
    for (const a of abonosPeriodo) {
      const montoConv = conv(a.monto, a.moneda)
      subtotalAbonos += montoConv
      rows.push([
        a.fecha,
        nombreTarjeta(a.tarjetaId, tarjetas),
        a.moneda,
        a.monto,
        +montoConv.toFixed(2),
        a.notas ?? '—',
      ])
    }
    rows.push(['', '', '', 'Subtotal', +subtotalAbonos.toFixed(2)])
    rows.push(sep())
  }

  // ── Gran total ──
  const granTotal = subtotalVar + subtotalCuotas + subtotalFijos - subtotalAbonos
  rows.push(['', '', '', '', '', `TOTAL NETO ${usuario.nombre.toUpperCase()}`, +granTotal.toFixed(2)])
  rows.push([`${simbolo}${Math.max(0, granTotal).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, '', '', '', '', '', ''])

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 18 },
    { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 8 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, usuario.nombre)
}

export function generarReporteExcel(datos: DatosReporte): void {
  const wb = XLSX.utils.book_new()

  for (const usuario of datos.usuarios) {
    agregarHojaUsuario(wb, usuario, datos)
  }

  const nombreArchivo = `reporte_${MESES[datos.periodo.mes - 1].toLowerCase()}_${datos.periodo.anio}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}
