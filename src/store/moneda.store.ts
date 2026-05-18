import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { TIPO_CAMBIO_COMPRA_DEFAULT, TIPO_CAMBIO_VENTA_DEFAULT } from '@/constants/moneda'
import { obtenerTipoCambio, guardarTipoCambioManual } from '@/services/tipoCambio.service'
import type { Moneda } from '@/types'

interface MonedaStore {
  monedaBase:          Moneda
  tipoCambioCompra:    number   // ARI compra USD — para CRC → USD
  tipoCambioVenta:     number   // ARI vende USD  — para USD → CRC
  /** Alias de venta — mantiene compatibilidad con código existente */
  tipoCambio:          number
  fuenteTipoCambio:    string
  ultimaActualizacion: number
  cargandoTipoCambio:  boolean
  setMonedaBase: (moneda: Moneda) => void
  fetchTipoCambio: () => Promise<void>
  setTipoCambioManual: (compra: number, venta: number) => Promise<void>
  /** USD→CRC usa tasa venta; CRC→USD usa tasa compra */
  convertir: (monto: number, de: Moneda, a: Moneda) => number
}

export const useMonedaStore = create<MonedaStore>()(
  devtools(
    persist(
      (set, get) => ({
        monedaBase:          'USD',
        tipoCambioCompra:    TIPO_CAMBIO_COMPRA_DEFAULT,
        tipoCambioVenta:     TIPO_CAMBIO_VENTA_DEFAULT,
        tipoCambio:          TIPO_CAMBIO_VENTA_DEFAULT,
        fuenteTipoCambio:    '',
        ultimaActualizacion: 0,
        cargandoTipoCambio:  false,

        setMonedaBase: (monedaBase) =>
          set({ monedaBase }, false, 'setMonedaBase'),

        fetchTipoCambio: async () => {
          set({ cargandoTipoCambio: true }, false, 'fetchTipoCambio/pending')
          const r = await obtenerTipoCambio()
          set(
            {
              tipoCambioCompra:    r.compra,
              tipoCambioVenta:     r.venta,
              tipoCambio:          r.venta,
              fuenteTipoCambio:    r.fuente,
              ultimaActualizacion: r.actualizadoEn,
              cargandoTipoCambio:  false,
            },
            false,
            'fetchTipoCambio/fulfilled'
          )
        },

        setTipoCambioManual: async (compra, venta) => {
          await guardarTipoCambioManual(compra, venta)
          set(
            {
              tipoCambioCompra:    compra,
              tipoCambioVenta:     venta,
              tipoCambio:          venta,
              fuenteTipoCambio:    'Manual',
              ultimaActualizacion: Date.now(),
            },
            false,
            'setTipoCambioManual'
          )
        },

        convertir: (monto, de, a) => {
          if (de === a) return monto
          const { tipoCambioCompra, tipoCambioVenta } = get()
          // USD → CRC: "¿cuántos colones necesito para comprar este monto en USD?" → tasa venta
          if (de === 'USD' && a === 'CRC') return monto * tipoCambioVenta
          // CRC → USD: "¿cuántos dólares obtengo vendiendo estos colones?" → tasa compra
          if (de === 'CRC' && a === 'USD') return monto / tipoCambioCompra
          return monto
        },
      }),
      {
        name: 'moneda-config',
        partialize: (s) => ({
          monedaBase:          s.monedaBase,
          tipoCambioCompra:    s.tipoCambioCompra,
          tipoCambioVenta:     s.tipoCambioVenta,
          tipoCambio:          s.tipoCambio,
          fuenteTipoCambio:    s.fuenteTipoCambio,
          ultimaActualizacion: s.ultimaActualizacion,
        }),
      }
    ),
    { name: 'moneda' }
  )
)
