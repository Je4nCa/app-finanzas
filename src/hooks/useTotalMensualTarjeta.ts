import { useState, useEffect } from 'react'
import { calcularTotalMensual, calcularTotalTodasLasTarjetas } from '@/services/tarjeta.service'
import { useMonedaStore } from '@/store'
import type { ID, PeriodoMensual } from '@/types'
import type { TotalMensualTarjeta } from '@/services/tarjeta.service'

export function useTotalMensualTarjeta(tarjetaId: ID | undefined, periodo: PeriodoMensual) {
  const tipoCambio = useMonedaStore((s) => s.tipoCambio)
  const [resultado, setResultado] = useState<TotalMensualTarjeta | undefined>(undefined)

  useEffect(() => {
    if (!tarjetaId) return
    calcularTotalMensual(tarjetaId, periodo, tipoCambio)
      .then(setResultado)
      .catch(console.error)
  }, [tarjetaId, periodo.anio, periodo.mes, tipoCambio])

  return resultado
}

export function useTotalTodasLasTarjetas(periodo: PeriodoMensual) {
  const tipoCambio = useMonedaStore((s) => s.tipoCambio)
  const monedaBase = useMonedaStore((s) => s.monedaBase)
  const [resultado, setResultado] = useState<
    { porTarjeta: TotalMensualTarjeta[]; granTotal: number } | undefined
  >(undefined)

  useEffect(() => {
    calcularTotalTodasLasTarjetas(periodo, tipoCambio, monedaBase)
      .then(setResultado)
      .catch(console.error)
  }, [periodo.anio, periodo.mes, tipoCambio, monedaBase])

  return resultado
}
