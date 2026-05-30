import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, CreditCard, Wallet, Percent, Settings } from 'lucide-react'
import { cn } from '@lib/utils'
import { motion } from 'framer-motion'

const NAV_ITEMS = [
  { a: '/dashboard',  icono: LayoutDashboard, etiqueta: 'Inicio'     },
  { a: '/gastos',     icono: Receipt,         etiqueta: 'Gastos'     },
  { a: '/tarjetas',   icono: CreditCard,      etiqueta: 'Tarjetas'   },
  { a: '/pagos',      icono: Wallet,          etiqueta: 'Pagos'      },
  { a: '/tasa-cero',  icono: Percent,         etiqueta: 'Tasa cero'  },
  { a: '/ajustes',    icono: Settings,        etiqueta: 'Ajustes'    },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border pb-safe">
      <ul className="flex items-center justify-around h-14 px-2">
        {NAV_ITEMS.map(({ a, icono: Icono, etiqueta }) => (
          <li key={a} className="flex-1">
            <NavLink
              to={a}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Icono size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                  </motion.div>
                  <span className="text-[10px] font-medium">{etiqueta}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
