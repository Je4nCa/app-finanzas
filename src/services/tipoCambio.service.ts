import { TIPO_CAMBIO_DEFAULT } from '@/constants/moneda'

const CACHE_KEY      = 'tipo_cambio_usd_crc'
const CACHE_TTL_MS   = 60 * 60 * 1000 // 1 hora
const API_URL        = 'https://open.er-api.com/v6/latest/USD'

interface CacheEntry {
  tipoCambio: number
  guardadoEn: number // timestamp ms
}

interface ApiResponse {
  result: string
  rates: Record<string, number>
  time_last_update_unix: number
}

function leerCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CacheEntry
  } catch {
    return null
  }
}

function escribirCache(tipoCambio: number): void {
  const entry: CacheEntry = { tipoCambio, guardadoEn: Date.now() }
  localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
}

function cacheVigente(entry: CacheEntry): boolean {
  return Date.now() - entry.guardadoEn < CACHE_TTL_MS
}

export interface ResultadoTipoCambio {
  tipoCambio: number
  /** Timestamp ms de cuándo se obtuvo el dato */
  actualizadoEn: number
  /** true si vino de la red, false si es caché o fallback */
  esNuevo: boolean
}

/**
 * Obtiene el tipo de cambio USD → CRC.
 * Prioridad: caché vigente → fetch red → caché vencida → constante default.
 */
export async function obtenerTipoCambio(): Promise<ResultadoTipoCambio> {
  const cache = leerCache()

  if (cache && cacheVigente(cache)) {
    return { tipoCambio: cache.tipoCambio, actualizadoEn: cache.guardadoEn, esNuevo: false }
  }

  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: ApiResponse = await res.json()
    if (data.result !== 'success' || !data.rates?.CRC) throw new Error('Respuesta inválida')

    const tipoCambio = Math.round(data.rates.CRC * 100) / 100
    escribirCache(tipoCambio)
    return { tipoCambio, actualizadoEn: Date.now(), esNuevo: true }
  } catch {
    // Red falló — usar caché vencida si existe, si no el default
    if (cache) {
      return { tipoCambio: cache.tipoCambio, actualizadoEn: cache.guardadoEn, esNuevo: false }
    }
    return { tipoCambio: TIPO_CAMBIO_DEFAULT, actualizadoEn: 0, esNuevo: false }
  }
}
