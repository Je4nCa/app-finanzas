import { useMonedaStore } from '@/store'

export function useTipoCambioActual() {
  const tipoCambio = useMonedaStore((s) => s.tipoCambio)
  return { tipoCambio }
}
