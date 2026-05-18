/**
 * Calcula el período de facturación de una tarjeta de crédito para
 * un mes de pago dado.
 *
 * Ejemplo: diaCierre=15, pagoMes=Abril 2026
 *   desde: 2026-03-16 (día siguiente al corte del mes anterior)
 *   hasta: 2026-04-15 (día de corte del mes de pago)
 *
 * Ejemplo: diaCierre=31, pagoMes=Abril 2026 (abril tiene 30 días)
 *   hasta: 2026-04-30   (último día del mes si cierre > días del mes)
 *   desde: 2026-04-01   (day 32 de marzo → desborda a 1 de abril)
 */
export function periodoFacturacion(
  anio: number,
  mes: number,       // 1-indexed: 1=enero, 12=diciembre
  diaCierre: number
): { desde: string; hasta: string } {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // "hasta": cierre del mes de pago, ajustado al último día si el mes tiene menos días
  const ultimoDiaMes = new Date(anio, mes, 0).getDate()
  const hasta = fmt(new Date(anio, mes - 1, Math.min(diaCierre, ultimoDiaMes)))

  // "desde": día siguiente al cierre del mes anterior
  // new Date con mes negativo o día overflow es manejado correctamente por JS:
  //   new Date(2026, -1, 16) = 16 dic 2025 ✓
  //   new Date(2026, 2, 32)  = 1 abr 2026  ✓ (cuando cierre=31)
  const desde = fmt(new Date(anio, mes - 2, diaCierre + 1))

  return { desde, hasta }
}

/**
 * Dado un gasto con una fecha ISO (YYYY-MM-DD) y el diaCierre de su tarjeta,
 * devuelve el período de pago (anio/mes) al que pertenece ese gasto.
 *
 * Útil para asignar un gasto al mes correcto de pago al guardarlo o mostrarlo.
 */
export function mesDePago(fechaGasto: string, diaCierre: number): { anio: number; mes: number } {
  const [anioStr, mesStr, diaStr] = fechaGasto.split('-')
  const anio = parseInt(anioStr)
  const mes  = parseInt(mesStr)
  const dia  = parseInt(diaStr)

  // Si la compra fue DESPUÉS del corte, pertenece al período del MES SIGUIENTE
  if (dia > diaCierre) {
    return mes === 12
      ? { anio: anio + 1, mes: 1 }
      : { anio, mes: mes + 1 }
  }

  // Si fue ANTES o EN el día de corte, pertenece al período del mes actual
  return { anio, mes }
}
