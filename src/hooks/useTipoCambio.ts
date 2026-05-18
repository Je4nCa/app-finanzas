import { useLiveQuery } from 'dexie-react-hooks'
import { tipoCambioRepository } from '@/repositories'
import { TIPO_CAMBIO_DEFAULT } from '@/constants/moneda'

export function useTipoCambioActual() {
  const tipoCambio = useLiveQuery(() => tipoCambioRepository.obtenerUltimo(), [])

  return {
    tipoCambio: tipoCambio?.usdACrc ?? TIPO_CAMBIO_DEFAULT,
    registro: tipoCambio,
  }
}
