import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { TIPO_CAMBIO_DEFAULT } from '@/constants/moneda'
import { obtenerTipoCambio } from '@/services/tipoCambio.service'
import type { Moneda } from '@/types'

interface MonedaStore {
  monedaBase: Moneda
  tipoCambio: number
  ultimaActualizacion: number   // timestamp ms, 0 = nunca
  cargandoTipoCambio: boolean
  setMonedaBase: (moneda: Moneda) => void
  setTipoCambio: (valor: number) => void
  fetchTipoCambio: () => Promise<void>
  convertir: (monto: number, de: Moneda, a: Moneda) => number
}

export const useMonedaStore = create<MonedaStore>()(
  devtools(
    persist(
      (set, get) => ({
        monedaBase: 'USD',
        tipoCambio: TIPO_CAMBIO_DEFAULT,
        ultimaActualizacion: 0,
        cargandoTipoCambio: false,

        setMonedaBase: (monedaBase) =>
          set({ monedaBase }, false, 'setMonedaBase'),

        setTipoCambio: (tipoCambio) =>
          set({ tipoCambio }, false, 'setTipoCambio'),

        fetchTipoCambio: async () => {
          set({ cargandoTipoCambio: true }, false, 'fetchTipoCambio/pending')
          const resultado = await obtenerTipoCambio()
          set(
            {
              tipoCambio: resultado.tipoCambio,
              ultimaActualizacion: resultado.actualizadoEn,
              cargandoTipoCambio: false,
            },
            false,
            'fetchTipoCambio/fulfilled'
          )
        },

        convertir: (monto, de, a) => {
          if (de === a) return monto
          const { tipoCambio } = get()
          if (de === 'USD' && a === 'CRC') return monto * tipoCambio
          if (de === 'CRC' && a === 'USD') return monto / tipoCambio
          return monto
        },
      }),
      {
        name: 'moneda-config',
        partialize: (s) => ({
          monedaBase: s.monedaBase,
          tipoCambio: s.tipoCambio,
          ultimaActualizacion: s.ultimaActualizacion,
        }),
      }
    ),
    { name: 'moneda' }
  )
)
