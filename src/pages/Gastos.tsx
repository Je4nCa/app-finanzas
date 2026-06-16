import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCollection } from '@/hooks/useCollection'
import { hCol } from '@/lib/firebase'
import { gastosRepository, gastosFijosRepository } from '@/repositories'
import { useGastosStore } from '@/store'
import { CATEGORIA_MAP } from '@/constants/categorias'
import { calcularPartes, etiquetaSplit } from '@/services/compartido.service'
import { mesDePago } from '@/lib/billingCycle'
import { cn } from '@/lib/utils'
import PageWrapper from '@components/ui/PageWrapper'
import FormularioGasto from '@components/gastos/FormularioGasto'
import FormularioGastoFijo from '@components/gastos/FormularioGastoFijo'
import type { Gasto, GastoFijo, TarjetaCredito, Usuario } from '@/types'

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

function labelMesPago(mes: number, anio: number, anioActual: number): string {
  if (anio === anioActual) return MESES[mes - 1]
  return `${MESES[mes - 1]} ${anio}`
}

/** Returns the amount this user owes for the given expense */
function montoParaUsuario(gasto: Gasto, userId: string): number {
  if (!gasto.esCompartido || !gasto.detalleCompartido) return gasto.monto
  const partes = calcularPartes(gasto.monto, gasto.detalleCompartido)
  return gasto.usuarioId === userId ? partes.montoPagador : partes.montoOtro
}

export default function Gastos() {
  const setPeriodo = useGastosStore((s) => s.setPeriodo)

  const ahora = new Date()
  const [periodo, setPeriodoLocal] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() + 1 })
  const { anio, mes } = periodo

  function navMes(delta: number) {
    let nuevoMes = mes + delta
    let nuevoAnio = anio
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio-- }
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++ }
    const nuevo = { anio: nuevoAnio, mes: nuevoMes }
    setPeriodoLocal(nuevo)
    setPeriodo(nuevo)
  }

  const [tab, setTab] = useState<Tab>('variables')

  const [modoFecha, setModoFecha] = useState<'compra' | 'pago'>('compra')

  const [filtroTarjeta, setFiltroTarjeta] = useState<string | null>(null)
  const [filtroCompartido, setFiltroCompartido] = useState(false)
  const [filtroUsuario, setFiltroUsuario] = useState<string | null>(null)

  const [panelGasto, setPanelGasto] = useState<PanelGasto>({ tipo: 'ninguno' })
  const [eliminandoGastoId, setEliminandoGastoId] = useState<string | null>(null)

  const [panelFijo, setPanelFijo] = useState<PanelFijo>({ tipo: 'ninguno' })
  const [eliminandoFijoId, setEliminandoFijoId] = useState<string | null>(null)

  const mostrarFormGasto = panelGasto.tipo !== 'ninguno'
  const mostrarFormFijo  = panelFijo.tipo  !== 'ninguno'

  const prefijo = `${anio}-${String(mes).padStart(2, '0')}`

  const todosGastos      = useCollection<Gasto>(() => hCol('gastos'), [])
  const todosGastosFijos = useCollection<GastoFijo>(() => hCol('gastosFijos'), [])
  const tarjetas         = useCollection<TarjetaCredito>(() => hCol('tarjetas'), [])
  const usuarios         = useCollection<Usuario>(() => hCol('usuarios'), [])

  // tarjetaMap needs to be before gastosMes so we can use it in the date filter
  const tarjetaMap = useMemo(() => {
    const map = new Map<string, TarjetaCredito>()
    tarjetas?.forEach((t) => map.set(t.id, t))
    return map
  }, [tarjetas])

  const gastosMes = useMemo(
    () => todosGastos
      ?.filter((g) => {
        if (modoFecha === 'pago' && g.tarjetaId) {
          const tarjeta = tarjetaMap.get(g.tarjetaId)
          if (tarjeta?.tipo === 'credito' && tarjeta.diaCierre) {
            const { anio: pAnio, mes: pMes } = mesDePago(g.fecha, tarjeta.diaCierre)
            return pAnio === anio && pMes === mes
          }
        }
        return g.fecha.startsWith(prefijo)
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [todosGastos, prefijo, modoFecha, tarjetaMap, anio, mes]
  )

  const gastos = useMemo(() => {
    if (!gastosMes) return gastosMes
    return gastosMes.filter((g) => {
      if (filtroTarjeta && g.tarjetaId !== filtroTarjeta) return false
      if (filtroCompartido && !g.esCompartido) return false
      if (filtroUsuario) {
        // Include: expenses paid by this user, OR shared expenses paid by the other user
        const esSuyo = g.usuarioId === filtroUsuario
        const esCompartidoConEl = g.esCompartido && g.usuarioId !== filtroUsuario
        if (!esSuyo && !esCompartidoConEl) return false
      }
      return true
    })
  }, [gastosMes, filtroTarjeta, filtroCompartido, filtroUsuario])

  const gastosFijos = useMemo(() => todosGastosFijos, [todosGastosFijos])

  // When a user filter is active, compute each user's total (their portions)
  const totalFiltrado = useMemo(() => {
    if (!gastos || !filtroUsuario) return null
    // Group by moneda
    const totales: Record<string, number> = {}
    for (const g of gastos) {
      const monto = montoParaUsuario(g, filtroUsuario)
      totales[g.moneda] = (totales[g.moneda] ?? 0) + monto
    }
    return totales
  }, [gastos, filtroUsuario])

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

  const chipBase = 'h-7 px-2.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap'
  const chipSelected = 'bg-primary text-primary-foreground'
  const chipUnselected = 'bg-secondary text-muted-foreground hover:bg-secondary/80'

  const usuarioFiltrado = filtroUsuario ? usuarios?.find((u) => u.id === filtroUsuario) : null

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

        <div className="flex items-center gap-1">
          <button
            onClick={() => navMes(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[70px] text-center">
            {MESES[mes - 1]} {anio}
          </span>
          <button
            onClick={() => navMes(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          {!mostrarFormGasto && !mostrarFormFijo && (
            <button
              onClick={() => tab === 'variables'
                ? setPanelGasto({ tipo: 'nuevo' })
                : setPanelFijo({ tipo: 'nuevo' })
              }
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold ml-1"
            >
              <Plus size={16} />
              Nuevo
            </button>
          )}
        </div>
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
          {/* Modo de fecha */}
          {!mostrarFormGasto && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Ver gastos por:</span>
              <div className="flex gap-1 p-0.5 rounded-lg bg-secondary">
                <button
                  onClick={() => setModoFecha('compra')}
                  className={cn(
                    'h-7 px-3 rounded-md text-xs font-medium transition-all',
                    modoFecha === 'compra'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  )}
                >
                  Fecha de compra
                </button>
                <button
                  onClick={() => setModoFecha('pago')}
                  className={cn(
                    'h-7 px-3 rounded-md text-xs font-medium transition-all',
                    modoFecha === 'pago'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  )}
                >
                  Mes de pago
                </button>
              </div>
            </div>
          )}

          {/* Filter bar */}
          {!mostrarFormGasto && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
              <button
                onClick={() => { setFiltroTarjeta(null); setFiltroCompartido(false); setFiltroUsuario(null) }}
                className={cn(chipBase, !filtroTarjeta && !filtroCompartido && !filtroUsuario ? chipSelected : chipUnselected)}
              >
                Todas
              </button>

              {tarjetas?.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFiltroTarjeta(filtroTarjeta === t.id ? null : t.id)}
                  className={cn(chipBase, filtroTarjeta === t.id ? chipSelected : chipUnselected, 'flex items-center gap-1.5')}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  {t.nombre}
                </button>
              ))}

              <button
                onClick={() => setFiltroCompartido(!filtroCompartido)}
                className={cn(chipBase, filtroCompartido ? chipSelected : chipUnselected)}
              >
                Compartidos
              </button>

              {usuarios?.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setFiltroUsuario(filtroUsuario === u.id ? null : u.id)}
                  className={cn(chipBase, filtroUsuario === u.id ? chipSelected : chipUnselected, 'flex items-center gap-1.5')}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.nombre.charAt(0)}
                  </span>
                  {u.nombre}
                </button>
              ))}
            </div>
          )}

          {/* Total por usuario (solo cuando hay filtro de usuario activo) */}
          {!mostrarFormGasto && filtroUsuario && totalFiltrado && usuarioFiltrado && (
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ backgroundColor: usuarioFiltrado.color + '18', border: `1px solid ${usuarioFiltrado.color}40` }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ backgroundColor: usuarioFiltrado.color }}
                >
                  {usuarioFiltrado.nombre.charAt(0)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total a pagar — {usuarioFiltrado.nombre}</p>
                  <p className="text-[10px] text-muted-foreground">Solo su porción (gastos propios + compartidos)</p>
                </div>
              </div>
              <div className="text-right">
                {Object.entries(totalFiltrado).map(([moneda, monto]) => (
                  <p key={moneda} className="text-base font-bold tabular-nums">
                    {moneda === 'USD' ? '$' : '₡'}{monto.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                ))}
              </div>
            </div>
          )}

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
                const esPagadorDelGasto = gasto.usuarioId === filtroUsuario
                const montoMostrar = filtroUsuario
                  ? montoParaUsuario(gasto, filtroUsuario)
                  : gasto.monto
                const esMontoReducido = filtroUsuario
                  && gasto.esCompartido
                  && montoMostrar !== gasto.monto

                let badgePago: string | null = null
                if (gasto.tarjetaId) {
                  const tarjeta = tarjetaMap.get(gasto.tarjetaId)
                  if (tarjeta && tarjeta.tipo === 'credito' && tarjeta.diaCierre) {
                    const { anio: pAnio, mes: pMes } = mesDePago(gasto.fecha, tarjeta.diaCierre)
                    badgePago = `Pago: ${labelMesPago(pMes, pAnio, anio)}`
                  }
                }

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
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{gasto.titulo}</p>
                          {/* Show who paid when filtering by user and it's not their expense */}
                          {filtroUsuario && !esPagadorDelGasto && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground leading-none shrink-0">
                              pagó {usuarios?.find(u => u.id === gasto.usuarioId)?.nombre ?? '?'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <p className="text-xs text-muted-foreground">{gasto.fecha}</p>
                          {gasto.esCompartido && gasto.detalleCompartido && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary leading-none">
                              {etiquetaSplit(gasto.detalleCompartido)}
                            </span>
                          )}
                          {badgePago && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground leading-none">
                              {badgePago}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">
                          {gasto.moneda === 'USD' ? '$' : '₡'}{montoMostrar.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                        {/* Show full amount as reference when reduced */}
                        {esMontoReducido && (
                          <p className="text-[10px] text-muted-foreground tabular-nums line-through">
                            {gasto.moneda === 'USD' ? '$' : '₡'}{gasto.monto.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
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

          {!mostrarFormFijo && gastosFijos?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-4xl">🔁</span>
              <p className="text-muted-foreground text-sm">Sin gastos fijos configurados</p>
            </div>
          )}

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
                            gasto.activo ? 'text-primary hover:bg-secondary' : 'text-muted-foreground hover:bg-secondary'
                          )}
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
