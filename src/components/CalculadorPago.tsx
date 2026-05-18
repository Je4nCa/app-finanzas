import { useState, useMemo } from 'react'
import { X, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Usuario } from '@/types'

interface CalculadorPagoProps {
  usuario: Usuario
  totalEnMoneda: number        // total to pay in user's monedaPreferida
  monedaUsuario: 'USD' | 'CRC'
  tipoCambio: number           // venta rate (USD→CRC)
  tipoCambioCompra: number     // compra rate (CRC→USD)
  onCerrar: () => void
}

function fmt(n: number, moneda: string) {
  return `${moneda === 'USD' ? '$' : '₡'}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export default function CalculadorPago({
  usuario,
  totalEnMoneda,
  monedaUsuario,
  tipoCambio,
  tipoCambioCompra,
  onCerrar,
}: CalculadorPagoProps) {
  const [usd, setUsd] = useState('')
  const [crc, setCrc] = useState('')

  const { disponibleEnMoneda, restante, sobrante } = useMemo(() => {
    const montoUsd = parseFloat(usd) || 0
    const montoCrc = parseFloat(crc) || 0

    let disponibleEnMoneda: number
    if (monedaUsuario === 'CRC') {
      // Convert USD to CRC using venta rate (how many CRC does $1 buy)
      disponibleEnMoneda = montoCrc + montoUsd * tipoCambio
    } else {
      // Convert CRC to USD using compra rate (how many USD does ₡1 sell)
      disponibleEnMoneda = montoUsd + montoCrc / tipoCambioCompra
    }

    const diff = totalEnMoneda - disponibleEnMoneda
    return {
      disponibleEnMoneda,
      restante: diff > 0 ? diff : 0,
      sobrante: diff < 0 ? Math.abs(diff) : 0,
    }
  }, [usd, crc, monedaUsuario, tipoCambio, tipoCambioCompra, totalEnMoneda])

  const pctCubierto = totalEnMoneda > 0
    ? Math.min((disponibleEnMoneda / totalEnMoneda) * 100, 100)
    : 0

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar() }}
    >
      <div className="w-full max-w-md bg-card rounded-3xl border border-border p-6 flex flex-col gap-5 shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: usuario.color }}
            >
              {usuario.nombre.charAt(0)}
            </div>
            <div>
              <p className="font-semibold">{usuario.nombre}</p>
              <p className="text-xs text-muted-foreground">Calculadora de pago</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Total a pagar */}
        <div className="rounded-2xl bg-secondary/60 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total a pagar este mes</span>
          </div>
          <span className="text-lg font-bold tabular-nums">{fmt(totalEnMoneda, monedaUsuario)}</span>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tengo disponible</p>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Dólares ($)</label>
              <div className="flex items-center gap-2 h-11 px-3 rounded-xl bg-secondary border border-border">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={usd}
                  onChange={(e) => setUsd(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-sm tabular-nums focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Colones (₡)</label>
              <div className="flex items-center gap-2 h-11 px-3 rounded-xl bg-secondary border border-border">
                <span className="text-sm text-muted-foreground">₡</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={crc}
                  onChange={(e) => setCrc(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-transparent text-sm tabular-nums focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* TC reference */}
          <p className="text-[11px] text-muted-foreground">
            TC usado: venta ₡{tipoCambio.toLocaleString()} · compra ₡{tipoCambioCompra.toLocaleString()}
          </p>
        </div>

        {/* Result */}
        {(parseFloat(usd) > 0 || parseFloat(crc) > 0) && (
          <div className="flex flex-col gap-3">
            {/* Progress bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Cobertura</span>
                <span>{pctCubierto.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    pctCubierto >= 100 ? 'bg-green-500' : pctCubierto >= 70 ? 'bg-amber-500' : 'bg-destructive'
                  )}
                  style={{ width: `${pctCubierto}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Disponible ({monedaUsuario})</span>
                <span className="font-semibold tabular-nums">{fmt(disponibleEnMoneda, monedaUsuario)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2 mt-1">
                {sobrante > 0 ? (
                  <>
                    <span className="text-green-500 font-semibold">Sobra</span>
                    <span className="text-green-500 font-bold tabular-nums">+{fmt(sobrante, monedaUsuario)}</span>
                  </>
                ) : restante > 0 ? (
                  <>
                    <span className="text-destructive font-semibold">Falta</span>
                    <span className="text-destructive font-bold tabular-nums">-{fmt(restante, monedaUsuario)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-green-500 font-semibold">Justo</span>
                    <span className="text-green-500 font-bold">✓</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
