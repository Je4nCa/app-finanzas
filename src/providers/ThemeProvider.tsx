import { useEffect, type ReactNode } from 'react'
import { useUIStore } from '@store/ui.store'

interface ThemeProviderProps {
  children: ReactNode
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const tema = useUIStore((s) => s.tema)

  useEffect(() => {
    // Dark mode por defecto — aplicar clase al html
    document.documentElement.className = tema
  }, [tema])

  return <>{children}</>
}
