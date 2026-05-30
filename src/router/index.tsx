import { lazy, Suspense } from 'react'
import { createHashRouter, Navigate } from 'react-router-dom'
import AppLayout from '@layouts/AppLayout'
import UsuarioGuard from '@/router/UsuarioGuard'
import LoadingScreen from '@components/ui/LoadingScreen'

const SeleccionUsuario = lazy(() => import('@pages/SeleccionUsuario'))
const Dashboard        = lazy(() => import('@pages/Dashboard'))
const Gastos           = lazy(() => import('@pages/Gastos'))
const Tarjetas         = lazy(() => import('@pages/Tarjetas'))
const TasaCero         = lazy(() => import('@pages/TasaCero'))
const Pagos            = lazy(() => import('@pages/Pagos'))
const Ajustes          = lazy(() => import('@pages/Ajustes'))

const wrap = (Component: React.ComponentType) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component />
  </Suspense>
)

export const router = createHashRouter([
  {
    path: '/seleccionar',
    element: wrap(SeleccionUsuario),
  },
  {
    path: '/',
    element: (
      <UsuarioGuard>
        <AppLayout />
      </UsuarioGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',  element: wrap(Dashboard)  },
      { path: 'gastos',     element: wrap(Gastos)     },
      { path: 'tarjetas',   element: wrap(Tarjetas)   },
      { path: 'pagos',      element: wrap(Pagos)      },
      { path: 'tasa-cero',  element: wrap(TasaCero)   },
      { path: 'ajustes',    element: wrap(Ajustes)    },
    ],
  },
])
