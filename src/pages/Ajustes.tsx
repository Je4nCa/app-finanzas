import { RefreshCw, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useMonedaStore, useUsuarioStore } from '@/store'
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
    monedaBase, setMonedaBase,
  } = useMonedaStore()

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
          {/* Compra / Venta */}
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

            <button
              onClick={() => fetchTipoCambio()}
              disabled={cargandoTipoCambio}
              className={cn(
                'w-11 h-11 flex items-center justify-center rounded-xl border border-border shrink-0',
                'text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
              title="Actualizar tipo de cambio"
            >
              <RefreshCw size={18} className={cn(cargandoTipoCambio && 'animate-spin')} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 pt-3 border-t border-border">
            <Row label="Fuente"               valor="ARI Casa de Cambio — BCCR Ventanilla" />
            <Row label="Última actualización" valor={tiempoRelativo(ultimaActualizacion)} />
            <Row label="Actualización auto."  valor="1 vez al día (9 AM)" />
            {fuenteTipoCambio && fuenteTipoCambio.includes('estimado') && (
              <p className="text-[11px] text-amber-500 mt-1">Sin conexión — usando valores estimados</p>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
          Compra: colones que recibís al vender USD. Venta: colones que pagás al comprar USD.
        </p>
      </section>

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
