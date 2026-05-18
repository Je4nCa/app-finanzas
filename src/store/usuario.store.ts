import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Usuario } from '@/types'

interface UsuarioStore {
  usuarioActivo: Usuario | null
  setUsuarioActivo: (usuario: Usuario) => void
  limpiarUsuario: () => void
}

export const useUsuarioStore = create<UsuarioStore>()(
  devtools(
    persist(
      (set) => ({
        usuarioActivo: null,

        setUsuarioActivo: (usuarioActivo) =>
          set({ usuarioActivo }, false, 'setUsuarioActivo'),

        limpiarUsuario: () =>
          set({ usuarioActivo: null }, false, 'limpiarUsuario'),
      }),
      { name: 'usuario-activo' }
    ),
    { name: 'usuario' }
  )
)
