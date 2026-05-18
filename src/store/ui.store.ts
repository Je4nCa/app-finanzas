import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type Tema = 'dark' | 'light'

interface UIStore {
  tema: Tema
  setTema: (tema: Tema) => void

  modalActivo: string | null
  abrirModal: (id: string) => void
  cerrarModal: () => void
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      tema: 'dark',

      setTema: (tema) => {
        document.documentElement.className = tema
        set({ tema }, false, 'setTema')
      },

      modalActivo: null,
      abrirModal: (id) => set({ modalActivo: id }, false, 'abrirModal'),
      cerrarModal: () => set({ modalActivo: null }, false, 'cerrarModal'),
    }),
    { name: 'ui' }
  )
)
