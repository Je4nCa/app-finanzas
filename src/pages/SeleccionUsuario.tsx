import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { useUsuarioStore } from '@/store'
import { seedDemoHousehold, enterDemoMode, isDemoMode } from '@/lib/demoMode'
import type { Usuario } from '@/types'

export default function SeleccionUsuario() {
  const usuarios = useCollection<Usuario>(() => hCol('usuarios'), [])
  const setUsuarioActivo = useUsuarioStore((s) => s.setUsuarioActivo)
  const navigate = useNavigate()
  const [cargandoDemo, setCargandoDemo] = useState(false)

  function seleccionar(usuario: Usuario) {
    setUsuarioActivo(usuario)
    navigate('/dashboard', { replace: true })
  }

  async function verDemo() {
    setCargandoDemo(true)
    await seedDemoHousehold()
    enterDemoMode()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pt-safe pb-safe">

      {/* Encabezado */}
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {!isDemoMode() && <p className="text-4xl mb-3">💑</p>}
        <h1 className="text-2xl font-bold text-foreground">
          {isDemoMode() ? 'TALENTA FINANZAS' : 'Mamocitos Financieros'}
        </h1>
        <p className="text-muted-foreground mt-1">¿Quién eres?</p>
      </motion.div>

      {/* Tarjetas de usuario */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {(usuarios ?? []).map((usuario, i) => (
          <motion.button
            key={usuario.id}
            onClick={() => seleccionar(usuario)}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-card border border-border active:scale-95 transition-transform text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ backgroundColor: usuario.color }}
            >
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">{usuario.nombre}</p>
              <p className="text-sm text-muted-foreground">{usuario.monedaPreferida}</p>
            </div>

            {/* Flecha */}
            <span className="text-muted-foreground text-lg">›</span>
          </motion.button>
        ))}

        {/* Demo */}
        <motion.div
          className="pt-2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">o</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <button
            onClick={verDemo}
            disabled={cargandoDemo}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {cargandoDemo ? 'Cargando demo…' : 'Ver versión demo'}
          </button>
        </motion.div>
      </div>

    </div>
  )
}
