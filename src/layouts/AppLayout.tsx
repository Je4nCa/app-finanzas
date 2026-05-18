import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from '@components/navigation/BottomNav'
import { AnimatePresence } from 'framer-motion'

export default function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto pb-20 pt-safe">
        <AnimatePresence mode="wait">
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  )
}
