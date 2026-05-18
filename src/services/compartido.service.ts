import type { DetalleCompartido } from '@/types'
import { TipoGastoCompartido } from '@/types'

export interface PartesCompartido {
  porcentajePagador: number
  porcentajeOtro: number
  montoPagador: number
  montoOtro: number
}

export function calcularPartes(monto: number, detalle: DetalleCompartido): PartesCompartido {
  switch (detalle.tipo) {
    case TipoGastoCompartido.MitadMitad:
      return {
        porcentajePagador: 50,
        porcentajeOtro: 50,
        montoPagador: monto / 2,
        montoOtro: monto / 2,
      }
    case TipoGastoCompartido.PorcentajePersonalizado: {
      const pct = detalle.porcentajeMio ?? 50
      return {
        porcentajePagador: pct,
        porcentajeOtro: 100 - pct,
        montoPagador: (monto * pct) / 100,
        montoOtro: (monto * (100 - pct)) / 100,
      }
    }
    default:
      return { porcentajePagador: 100, porcentajeOtro: 0, montoPagador: monto, montoOtro: 0 }
  }
}

export function etiquetaSplit(detalle: DetalleCompartido): string {
  if (detalle.tipo === TipoGastoCompartido.MitadMitad) return '50 / 50'
  const pct = detalle.porcentajeMio ?? 50
  return `${pct} / ${100 - pct}`
}
