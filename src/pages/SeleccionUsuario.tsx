import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { db } from '@/database/db'
import { useUsuarioStore } from '@/store'
import type { Usuario } from '@/types'

export default function SeleccionUsuario() {
  const usuarios = useLiveQuery(() => db.usuarios.toArray(), [])
  const setUsuarioActivo = useUsuarioStore((s) => s.setUsuarioActivo)
  const navigate = useNavigate()

  function seleccionar(usuario: Usuario) {
    setUsuarioActivo(usuario)
    navigate('/dashboard', { replace: true })
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
        <p className="text-4xl mb-3">💑</p>
        <h1 className="text-2xl font-bold text-foreground">Mamocitos Financieros</h1>
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
      </div>

    </div>
  )
}
