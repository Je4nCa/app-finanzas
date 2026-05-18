import { useLiveQuery } from 'dexie-react-hooks'
import { calcularTotalMensual, calcularTotalTodasLasTarjetas } from '@/services/tarjeta.service'
import { useMonedaStore } from '@/store'
import type { ID, PeriodoMensual } from '@/types'

/** Total mensual de una tarjeta específica, se recalcula al cambiar IndexedDB */
export function useTotalMensualTarjeta(tarjetaId: ID | undefined, periodo: PeriodoMensual) {
  const tipoCambio = useMonedaStore((s) => s.tipoCambio)

  const resultado = useLiveQuery(
    () =>
      tarjetaId
        ? calcularTotalMensual(tarjetaId, periodo, tipoCambio)
        : undefined,
    [tarjetaId, periodo.anio, periodo.mes, tipoCambio]
  )

  return resultado
}

/** Totales de todas las tarjetas + gran total en moneda base */
export function useTotalTodasLasTarjetas(periodo: PeriodoMensual) {
  const tipoCambio  = useMonedaStore((s) => s.tipoCambio)
  const monedaBase  = useMonedaStore((s) => s.monedaBase)

  const resultado = useLiveQuery(
    () => calcularTotalTodasLasTarjetas(periodo, tipoCambio, monedaBase),
    [periodo.anio, periodo.mes, tipoCambio, monedaBase]
  )

  return resultado
}
