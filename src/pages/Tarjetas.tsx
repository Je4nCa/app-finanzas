import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { tarjetasRepository } from '@/repositories'
import { useMonedaStore } from '@/store'
import { cn } from '@/lib/utils'
import PageWrapper from '@components/ui/PageWrapper'
import FormularioTarjeta from '@components/tarjetas/FormularioTarjeta'
import type { TarjetaCredito, Gasto } from '@/types'

type PanelActivo =
  | { tipo: 'ninguno' }
  | { tipo: 'nueva' }
  | { tipo: 'editar'; tarjeta: TarjetaCredito }

function SaldoDebito({ tarjeta, gastos }: { tarjeta: TarjetaCredito; gastos: Gasto[] }) {
  const tipoCambio = useMonedaStore((s) => s.tipoCambio)

  const gastado = useMemo(() =>
    gastos
      .filter((g) => g.tarjetaId === tarjeta.id)
      .reduce((sum, g) => {
        const monto = g.moneda === tarjeta.moneda
          ? g.monto
          : g.moneda === 'USD'
            ? g.monto * (g.tipoCambioAlMomento ?? tipoCambio)
            : g.monto / (g.tipoCambioAlMomento ?? tipoCambio)
        return sum + monto
      }, 0),
    [gastos, tarjeta, tipoCambio]
  )

  const saldoActual = (tarjeta.saldoInicial ?? 0) - gastado
  const simbolo     = tarjeta.moneda === 'USD' ? '$' : '₡'

  return (
    <div className="text-right shrink-0">
      <p className={cn('text-sm font-semibold tabular-nums', saldoActual < 0 && 'text-destructive')}>
        {simbolo}{saldoActual.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
      <p className="text-[10px] text-muted-foreground">disponible</p>
    </div>
  )
}

export default function Tarjetas() {
  const tarjetas = useCollection<TarjetaCredito>(() => hCol('tarjetas'), [])
  const gastos   = useCollection<Gasto>(() => hCol('gastos'), [])

  const [panel, setPanel] = useState<PanelActivo>({ tipo: 'ninguno' })
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const mostrarFormulario = panel.tipo === 'nueva' || panel.tipo === 'editar'

  function cerrarPanel() { setPanel({ tipo: 'ninguno' }) }

  async function handleEliminar(id: string) {
    await tarjetasRepository.eliminar(id)
    setEliminandoId(null)
  }

  return (
    <PageWrapper className="px-4 py-6 flex flex-col gap-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarjetas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {tarjetas?.length
              ? `${tarjetas.length} tarjeta${tarjetas.length !== 1 ? 's' : ''}`
              : 'Sin tarjetas aún'}
          </p>
        </div>

        {!mostrarFormulario && (
          <button
            onClick={() => setPanel({ tipo: 'nueva' })}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Plus size={16} />
            Nueva
          </button>
        )}
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {mostrarFormulario && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="text-base font-semibold mb-4">
                {panel.tipo === 'editar' ? 'Editar tarjeta' : 'Nueva tarjeta'}
              </h2>
              <FormularioTarjeta
                tarjetaInicial={panel.tipo === 'editar' ? panel.tarjeta : undefined}
                onGuardado={cerrarPanel}
                onCancelar={cerrarPanel}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estado vacío */}
      {tarjetas?.length === 0 && !mostrarFormulario && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-4xl">💳</span>
          <p className="text-muted-foreground text-sm">Agrega tu primera tarjeta para empezar</p>
        </div>
      )}

      {/* Lista */}
      {tarjetas && tarjetas.length > 0 && (
        <div className="flex flex-col gap-3">
          {tarjetas.map((tarjeta) => (
            <div key={tarjeta.id}>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                <div className="w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: tarjeta.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{tarjeta.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {tarjeta.banco} · {tarjeta.moneda} ·{' '}
                    <span className="capitalize">{tarjeta.tipo}</span>
                  </p>
                </div>

                {tarjeta.tipo === 'debito' ? (
                  <SaldoDebito tarjeta={tarjeta} gastos={gastos ?? []} />
                ) : tarjeta.limite ? (
                  <p className="text-sm font-medium tabular-nums shrink-0">
                    {tarjeta.moneda === 'USD' ? '$' : '₡'}{tarjeta.limite.toLocaleString()}
                  </p>
                ) : null}

                <div className="flex gap-1 ml-1">
                  <button
                    onClick={() => setPanel({ tipo: 'editar', tarjeta })}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setEliminandoId(eliminandoId === tarjeta.id ? null : tarjeta.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {eliminandoId === tarjeta.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 mx-1 rounded-b-xl bg-destructive/10 border border-t-0 border-destructive/20">
                      <p className="text-sm text-destructive font-medium">¿Eliminar {tarjeta.nombre}?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setEliminandoId(null)} className="h-8 px-3 rounded-lg text-xs text-muted-foreground border border-border">Cancelar</button>
                        <button onClick={() => handleEliminar(tarjeta.id)} className="h-8 px-3 rounded-lg text-xs bg-destructive text-white font-semibold">Eliminar</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

    </PageWrapper>
  )
}
