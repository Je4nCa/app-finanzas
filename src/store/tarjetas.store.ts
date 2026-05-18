import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { tarjetasRepository } from '@/repositories'
import type { TarjetaCredito, ID } from '@/types'

interface TarjetasStore {
  tarjetas: TarjetaCredito[]
  seleccionada: TarjetaCredito | null
  cargando: boolean
  error: string | null

  cargar: () => Promise<void>
  crear: (tarjeta: TarjetaCredito) => Promise<void>
  actualizar: (id: ID, cambios: Partial<TarjetaCredito>) => Promise<void>
  eliminar: (id: ID) => Promise<void>
  seleccionar: (tarjeta: TarjetaCredito | null) => void
}

export const useTarjetasStore = create<TarjetasStore>()(
  devtools(
    (set) => ({
      tarjetas: [],
      seleccionada: null,
      cargando: false,
      error: null,

      cargar: async () => {
        set({ cargando: true, error: null }, false, 'cargar/pending')
        try {
          const tarjetas = await tarjetasRepository.obtenerTodas()
          set({ tarjetas, cargando: false }, false, 'cargar/fulfilled')
        } catch (e) {
          set({ error: (e as Error).message, cargando: false }, false, 'cargar/rejected')
        }
      },

      crear: async (tarjeta) => {
        await tarjetasRepository.crear(tarjeta)
        set(
          (s) => ({ tarjetas: [...s.tarjetas, tarjeta] }),
          false,
          'crear'
        )
      },

      actualizar: async (id, cambios) => {
        await tarjetasRepository.actualizar(id, cambios)
        set(
          (s) => ({
            tarjetas: s.tarjetas.map((t) =>
              t.id === id ? { ...t, ...cambios } : t
            ),
            seleccionada:
              s.seleccionada?.id === id
                ? { ...s.seleccionada, ...cambios }
                : s.seleccionada,
          }),
          false,
          'actualizar'
        )
      },

      eliminar: async (id) => {
        await tarjetasRepository.eliminar(id)
        set(
          (s) => ({
            tarjetas: s.tarjetas.filter((t) => t.id !== id),
            seleccionada: s.seleccionada?.id === id ? null : s.seleccionada,
          }),
          false,
          'eliminar'
        )
      },

      seleccionar: (seleccionada) =>
        set({ seleccionada }, false, 'seleccionar'),
    }),
    { name: 'tarjetas' }
  )
)
