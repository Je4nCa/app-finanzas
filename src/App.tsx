import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import ThemeProvider from '@/providers/ThemeProvider'
import { useMonedaStore } from '@/store'

function AppInit() {
  const fetchTipoCambio = useMonedaStore((s) => s.fetchTipoCambio)

  useEffect(() => {
    fetchTipoCambio()
  }, [fetchTipoCambio])

  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInit />
    </ThemeProvider>
  )
}
