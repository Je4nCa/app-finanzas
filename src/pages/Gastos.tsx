import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { db } from '@/database/db'
import { gastosRepository, gastosFijosRepository } from '@/repositories'
import { useGastosStore } from '@/store'
import { CATEGORIA_MAP } from '@/constants/categorias'
import { etiquetaSplit } from '@/services/compartido.service'
import { cn } from '@/lib/utils'
import PageWrapper from '@components/ui/PageWrapper'
import FormularioGasto from '@components/gastos/FormularioGasto'
import FormularioGastoFijo from '@components/gastos/FormularioGastoFijo'
import type { Gasto, GastoFijo } from '@/types'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

type Tab = 'variables' | 'fijos'

type PanelGasto =
  | { tipo: 'ninguno' }
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; gasto: Gasto }

type PanelFijo =
  | { tipo: 'ninguno' }
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; gasto: GastoFijo }

export default function Gastos() {
  const { periodoActivo } = useGastosStore()
  const { anio, mes } = periodoActivo

  const [tab, setTab] = useState<Tab>('variables')

  const [panelGasto, setPanelGasto] = useState<PanelGasto>({ tipo: 'ninguno' })
  const [eliminandoGastoId, setEliminandoGastoId] = useState<string | null>(null)

  const [panelFijo, setPanelFijo] = useState<PanelFijo>({ tipo: 'ninguno' })
  const [eliminandoFijoId, setEliminandoFijoId] = useState<string | null>(null)

  const mostrarFormGasto = panelGasto.tipo !== 'ninguno'
  const mostrarFormFijo  = panelFijo.tipo  !== 'ninguno'

  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`
  const gastos = useLiveQuery(
    () => db.gastos.where('fecha').startsWith(prefijo).reverse().toArray(),
    [prefijo]
  )
  const gastosFijos = useLiveQuery(() => db.gastosFijos.toArray(), [])

  async function handleEliminarGasto(id: string) {
    await gastosRepository.eliminar(id)
    setEliminandoGastoId(null)
  }

  async function handleEliminarFijo(id: string) {
    await gastosFijosRepository.eliminar(id)
    setEliminandoFijoId(null)
  }

  async function toggleActivo(gasto: GastoFijo) {
    await gastosFijosRepository.actualizar(gasto.id, { activo: !gasto.activo })
  }

  return (
    <PageWrapper className="px-4 py-6 flex flex-col gap-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gastos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {tab === 'variables'
              ? `${MESES[mes - 1]} ${anio} · ${gastos?.length ?? 0} registros`
              : `${gastosFijos?.length ?? 0} gastos fijos`}
          </p>
        </div>

        {!mostrarFormGasto && !mostrarFormFijo && (
          <button
            onClick={() => tab === 'variables'
              ? setPanelGasto({ tipo: 'nuevo' })
              : setPanelFijo({ tipo: 'nuevo' })
            }
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Plus size={16} />
            Nuevo
          </button>
        )}
      </div>

      {/* Tabs */}
      {!mostrarFormGasto && !mostrarFormFijo && (
        <div className="flex gap-1 p-1 rounded-xl bg-secondary">
          {(['variables', 'fijos'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 h-9 rounded-lg text-sm font-medium transition-all',
                tab === t
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              {t === 'variables' ? 'Variables' : 'Fijos'}
            </button>
          ))}
        </div>
      )}

      {/* ── TAB VARIABLES ─────────────────────────────────── */}
      {tab === 'variables' && (
        <>
          {/* Formulario nuevo / editar */}
          <AnimatePresence>
            {mostrarFormGasto && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-card border border-border rounded-2xl p-4">
                  <h2 className="text-base font-semibold mb-4">
                    {panelGasto.tipo === 'editar' ? 'Editar gasto' : 'Nuevo gasto'}
                  </h2>
                  <FormularioGasto
                    gastoInicial={panelGasto.tipo === 'editar' ? panelGasto.gasto : undefined}
                    onGuardado={() => setPanelGasto({ tipo: 'ninguno' })}
                    onCancelar={() => setPanelGasto({ tipo: 'ninguno' })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Estado vacío */}
          {!mostrarFormGasto && gastos?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-4xl">💸</span>
              <p className="text-muted-foreground text-sm">Sin gastos este mes</p>
            </div>
          )}

          {/* Lista variables */}
          {gastos && gastos.length > 0 && (
            <div className="flex flex-col gap-2">
              {gastos.map((gasto) => {
                const cat = CATEGORIA_MAP[gasto.categoriaId]
                return (
                  <div key={gasto.id}>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: (cat?.color ?? '#6b7280') + '22' }}
                      >
                        {cat?.emoji ?? '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{gasto.titulo}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-muted-foreground">{gasto.fecha}</p>
                          {gasto.esCompartido && gasto.detalleCompartido && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary leading-none">
                              {etiquetaSplit(gasto.detalleCompartido)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold tabular-nums shrink-0">
                        {gasto.moneda === 'USD' ? '$' : '₡'}{gasto.monto.toLocaleString()}
                      </p>
                      <div className="flex gap-1 ml-1">
                        <button
                          onClick={() => { setEliminandoGastoId(null); setPanelGasto({ tipo: 'editar', gasto }) }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setEliminandoGastoId(eliminandoGastoId === gasto.id ? null : gasto.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {eliminandoGastoId === gasto.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-4 py-3 mx-1 rounded-b-xl bg-destructive/10 border border-t-0 border-destructive/20">
                            <p className="text-sm text-destructive font-medium">¿Eliminar {gasto.titulo}?</p>
                            <div className="flex gap-2">
                              <button onClick={() => setEliminandoGastoId(null)} className="h-8 px-3 rounded-lg text-xs text-muted-foreground border border-border">Cancelar</button>
                              <button onClick={() => handleEliminarGasto(gasto.id)} className="h-8 px-3 rounded-lg text-xs bg-destructive text-white font-semibold">Eliminar</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB FIJOS ─────────────────────────────────────── */}
      {tab === 'fijos' && (
        <>
          {/* Formulario nuevo / editar fijo */}
          <AnimatePresence>
            {mostrarFormFijo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-card border border-border rounded-2xl p-4">
                  <h2 className="text-base font-semibold mb-4">
                    {panelFijo.tipo === 'editar' ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}
                  </h2>
                  <FormularioGastoFijo
                    gastoFijoInicial={panelFijo.tipo === 'editar' ? panelFijo.gasto : undefined}
                    onGuardado={() => setPanelFijo({ tipo: 'ninguno' })}
                    onCancelar={() => setPanelFijo({ tipo: 'ninguno' })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Estado vacío */}
          {!mostrarFormFijo && gastosFijos?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-4xl">🔁</span>
              <p className="text-muted-foreground text-sm">Sin gastos fijos configurados</p>
            </div>
          )}

          {/* Lista fijos */}
          {gastosFijos && gastosFijos.length > 0 && !mostrarFormFijo && (
            <div className="flex flex-col gap-2">
              {gastosFijos.map((gasto) => {
                const cat = CATEGORIA_MAP[gasto.categoriaId]
                return (
                  <div key={gasto.id}>
                    <div className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border transition-opacity',
                      !gasto.activo && 'opacity-50'
                    )}>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: (cat?.color ?? '#6b7280') + '22' }}
                      >
                        {cat?.emoji ?? '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{gasto.titulo}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-muted-foreground capitalize">{gasto.recurrencia}</p>
                          {gasto.esCompartido && gasto.detalleCompartido && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary leading-none">
                              {etiquetaSplit(gasto.detalleCompartido)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-semibold tabular-nums shrink-0">
                        {gasto.moneda === 'USD' ? '$' : '₡'}{gasto.monto.toLocaleString()}
                      </p>
                      <div className="flex gap-1 ml-1">
                        <button
                          onClick={() => toggleActivo(gasto)}
                          className={cn(
                            'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                            gasto.activo
                              ? 'text-primary hover:bg-secondary'
                              : 'text-muted-foreground hover:bg-secondary'
                          )}
                          title={gasto.activo ? 'Pausar' : 'Activar'}
                        >
                          <RefreshCw size={15} />
                        </button>
                        <button
                          onClick={() => { setEliminandoFijoId(null); setPanelFijo({ tipo: 'editar', gasto }) }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setEliminandoFijoId(eliminandoFijoId === gasto.id ? null : gasto.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {eliminandoFijoId === gasto.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-4 py-3 mx-1 rounded-b-xl bg-destructive/10 border border-t-0 border-destructive/20">
                            <p className="text-sm text-destructive font-medium">¿Eliminar {gasto.titulo}?</p>
                            <div className="flex gap-2">
                              <button onClick={() => setEliminandoFijoId(null)} className="h-8 px-3 rounded-lg text-xs text-muted-foreground border border-border">Cancelar</button>
                              <button onClick={() => handleEliminarFijo(gasto.id)} className="h-8 px-3 rounded-lg text-xs bg-destructive text-white font-semibold">Eliminar</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

    </PageWrapper>
  )
}
