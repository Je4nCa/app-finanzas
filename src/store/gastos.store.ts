import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { gastosRepository } from '@/repositories'
import type { Gasto, PeriodoMensual, ID } from '@/types'

interface GastosStore {
  gastos: Gasto[]
  periodoActivo: PeriodoMensual
  cargando: boolean
  error: string | null

  cargarPorPeriodo: (anio: number, mes: number) => Promise<void>
  crear: (gasto: Gasto) => Promise<void>
  actualizar: (id: ID, cambios: Partial<Gasto>) => Promise<void>
  eliminar: (id: ID) => Promise<void>
  setPeriodo: (periodo: PeriodoMensual) => void
}

const ahora = new Date()

export const useGastosStore = create<GastosStore>()(
  devtools(
    (set) => ({
      gastos: [],
      cargando: false,
      error: null,
      periodoActivo: {
        anio: ahora.getFullYear(),
        mes: ahora.getMonth() + 1,
      },

      cargarPorPeriodo: async (anio, mes) => {
        set({ cargando: true, error: null }, false, 'cargarPorPeriodo/pending')
        try {
          const gastos = await gastosRepository.obtenerPorPeriodo(anio, mes)
          set({ gastos, cargando: false }, false, 'cargarPorPeriodo/fulfilled')
        } catch (e) {
          set({ error: (e as Error).message, cargando: false }, false, 'cargarPorPeriodo/rejected')
        }
      },

      crear: async (gasto) => {
        await gastosRepository.crear(gasto)
        set(
          (s) => ({ gastos: [gasto, ...s.gastos] }),
          false,
          'crear'
        )
      },

      actualizar: async (id, cambios) => {
        await gastosRepository.actualizar(id, cambios)
        set(
          (s) => ({
            gastos: s.gastos.map((g) =>
              g.id === id ? { ...g, ...cambios } : g
            ),
          }),
          false,
          'actualizar'
        )
      },

      eliminar: async (id) => {
        await gastosRepository.eliminar(id)
        set(
          (s) => ({ gastos: s.gastos.filter((g) => g.id !== id) }),
          false,
          'eliminar'
        )
      },

      setPeriodo: (periodoActivo) =>
        set({ periodoActivo }, false, 'setPeriodo'),
    }),
    { name: 'gastos' }
  )
)
