import { RefreshCw, LogOut, Pencil, Check, X, FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useMonedaStore, useUsuarioStore } from '@/store'
import { isDemoMode, exitDemoMode } from '@/lib/demoMode'
import { cn } from '@/lib/utils'
import PageWrapper from '@components/ui/PageWrapper'
import type { Moneda } from '@/types'

function tiempoRelativo(ts: number): string {
  if (!ts) return 'Nunca'
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)    return 'Hace un momento'
  if (diff < 3600)  return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return `Hace ${Math.floor(diff / 86400)} días`
}

export default function Ajustes() {
  const navigate = useNavigate()

  const {
    tipoCambioCompra, tipoCambioVenta, fuenteTipoCambio,
    ultimaActualizacion, cargandoTipoCambio, fetchTipoCambio,
    setTipoCambioManual, monedaBase, setMonedaBase,
  } = useMonedaStore()

  const [editandoTC, setEditandoTC] = useState(false)
  const [inputCompra, setInputCompra] = useState('')
  const [inputVenta, setInputVenta] = useState('')
  const [guardandoTC, setGuardandoTC] = useState(false)
  const [errorTC, setErrorTC] = useState<string | null>(null)

  function abrirEdicion() {
    setInputCompra(tipoCambioCompra.toString())
    setInputVenta(tipoCambioVenta.toString())
    setErrorTC(null)
    setEditandoTC(true)
  }

  async function guardarTC() {
    const compra = parseFloat(inputCompra)
    const venta  = parseFloat(inputVenta)
    if (!compra || compra <= 0) { setErrorTC('Compra inválida'); return }
    if (!venta  || venta  <= 0) { setErrorTC('Venta inválida');  return }
    if (compra > venta) { setErrorTC('Compra no puede ser mayor que venta'); return }
    setGuardandoTC(true)
    setErrorTC(null)
    try {
      await setTipoCambioManual(compra, venta)
      setEditandoTC(false)
    } catch {
      setErrorTC('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setGuardandoTC(false)
    }
  }

  const { usuarioActivo, limpiarUsuario } = useUsuarioStore()

  function cambiarUsuario() {
    limpiarUsuario()
    navigate('/seleccionar', { replace: true })
  }

  return (
    <PageWrapper className="px-4 py-6 flex flex-col gap-6">

      <div>
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Configuración de la app</p>
      </div>

      {/* ── Perfil activo ─── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Perfil activo
        </p>

        {usuarioActivo ? (
          <div className="rounded-2xl bg-card border border-border p-4 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
              style={{ backgroundColor: usuarioActivo.color }}
            >
              {usuarioActivo.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{usuarioActivo.nombre}</p>
              <p className="text-xs text-muted-foreground">Moneda preferida: {usuarioActivo.monedaPreferida}</p>
            </div>
            <button
              onClick={cambiarUsuario}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors shrink-0"
            >
              <LogOut size={14} />
              Cambiar
            </button>
          </div>
        ) : (
          <button
            onClick={cambiarUsuario}
            className="rounded-2xl bg-card border border-border p-4 text-sm text-muted-foreground text-left"
          >
            Sin perfil activo — Toca para seleccionar
          </button>
        )}
      </section>

      {/* ── Moneda base ─── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Moneda base del dashboard
        </p>

        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Todos los totales y el resumen se muestran en esta moneda.
          </p>
          <div className="flex rounded-xl overflow-hidden border border-border">
            {(['USD', 'CRC'] as Moneda[]).map((m) => (
              <button
                key={m}
                onClick={() => setMonedaBase(m)}
                className={cn(
                  'flex-1 h-11 text-sm font-semibold transition-colors',
                  monedaBase === m
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary'
                )}
              >
                {m === 'USD' ? '$ USD — Dólar' : '₡ CRC — Colón'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tipo de cambio ─── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Tipo de cambio
        </p>

        <div className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-4">
          {editandoTC ? (
            /* ── Modo edición ── */
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">Ingresá los valores actuales del BCCR (₡ por $1)</p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Compra</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={inputCompra}
                    onChange={(e) => setInputCompra(e.target.value)}
                    placeholder="515.00"
                    autoFocus
                    className="w-full mt-1 h-11 px-3 rounded-xl bg-secondary border border-border text-lg font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Venta</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={inputVenta}
                    onChange={(e) => setInputVenta(e.target.value)}
                    placeholder="520.00"
                    className="w-full mt-1 h-11 px-3 rounded-xl bg-secondary border border-border text-lg font-bold tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              {errorTC && <p className="text-xs text-destructive">{errorTC}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditandoTC(false)}
                  className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <X size={14} /> Cancelar
                </button>
                <button
                  onClick={guardarTC}
                  disabled={guardandoTC}
                  className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                >
                  <Check size={14} /> {guardandoTC ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            /* ── Modo lectura ── */
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Compra</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {cargandoTipoCambio
                        ? <span className="text-muted-foreground text-xl">…</span>
                        : <>₡{tipoCambioCompra.toLocaleString(undefined, { maximumFractionDigits: 2 })}</>
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Venta</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {cargandoTipoCambio
                        ? <span className="text-muted-foreground text-xl">…</span>
                        : <>₡{tipoCambioVenta.toLocaleString(undefined, { maximumFractionDigits: 2 })}</>
                      }
                    </p>
                  </div>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={abrirEdicion}
                    className="w-11 h-11 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Editar manualmente"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => fetchTipoCambio()}
                    disabled={cargandoTipoCambio}
                    className={cn(
                      'w-11 h-11 flex items-center justify-center rounded-xl border border-border shrink-0',
                      'text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors',
                      'disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                    title="Recargar desde Firestore"
                  >
                    <RefreshCw size={16} className={cn(cargandoTipoCambio && 'animate-spin')} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
                <Row label="Fuente"               valor={fuenteTipoCambio || 'ARI Casa de Cambio — BCCR'} />
                <Row label="Última actualización" valor={tiempoRelativo(ultimaActualizacion)} />
                <Row label="Actualización auto."  valor="1 vez al día (9 AM)" />
                {fuenteTipoCambio && fuenteTipoCambio.includes('estimado') && (
                  <p className="text-[11px] text-amber-500 mt-1">Sin conexión — usando valores estimados</p>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
          Compra: colones que recibís al vender USD. Venta: colones que pagás al comprar USD.
        </p>
      </section>

      {/* ── Modo demo ─── */}
      {isDemoMode() && (
        <section className="flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Modo demo
          </p>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3">
            <FlaskConical size={18} className="text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-500">Demo activo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Los datos son ficticios — nada de esto es real</p>
            </div>
            <button
              onClick={exitDemoMode}
              className="h-9 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Salir
            </button>
          </div>
        </section>
      )}

      {/* ── Cuenta Google ─── */}
      <section className="flex flex-col gap-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Cuenta
        </p>
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-3 h-12 px-4 rounded-2xl bg-card border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión de Google
        </button>
      </section>

    </PageWrapper>
  )
}

function Row({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{valor}</span>
    </div>
  )
}
