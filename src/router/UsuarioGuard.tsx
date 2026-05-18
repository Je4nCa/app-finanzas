import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useUsuarioStore } from '@/store'

interface Props {
  children: ReactNode
}

export default function UsuarioGuard({ children }: Props) {
  const usuarioActivo = useUsuarioStore((s) => s.usuarioActivo)

  if (!usuarioActivo) {
    return <Navigate to="/seleccionar" replace />
  }

  return <>{children}</>
}
