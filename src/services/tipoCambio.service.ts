import { getDoc } from 'firebase/firestore'
import { hDoc } from '@/lib/firebase'
import { TIPO_CAMBIO_COMPRA_DEFAULT, TIPO_CAMBIO_VENTA_DEFAULT } from '@/constants/moneda'
import type { TipoCambioARI } from '@/types'

const CACHE_KEY    = 'tipo_cambio_ari_v2'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 1 día

interface CacheEntry {
  compra:       number
  venta:        number
  fuente:       string
  guardadoEn:   number
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

function escribirCache(compra: number, venta: number, fuente: string): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ compra, venta, fuente, guardadoEn: Date.now() }))
}

function cacheVigente(entry: CacheEntry): boolean {
  return Date.now() - entry.guardadoEn < CACHE_TTL_MS
}

export interface ResultadoTipoCambio {
  compra:       number
  venta:        number
  fuente:       string
  actualizadoEn: number
  esNuevo:      boolean
}

export async function guardarTipoCambioManual(compra: number, venta: number): Promise<void> {
  const { setDoc } = await import('firebase/firestore')
  await setDoc(hDoc('config', 'tipoCambio'), {
    compra,
    venta,
    fuente: 'Manual',
    fechaActualizacion: new Date().toISOString(),
  })
  escribirCache(compra, venta, 'Manual')
}

/**
 * Lee el tipo de cambio ARI desde Firestore (actualizado por GitHub Actions diariamente).
 * Prioridad: caché del día → Firestore → caché vencida → constante default.
 */
export async function obtenerTipoCambio(): Promise<ResultadoTipoCambio> {
  const cache = leerCache()

  if (cache && cacheVigente(cache)) {
    return { compra: cache.compra, venta: cache.venta, fuente: cache.fuente, actualizadoEn: cache.guardadoEn, esNuevo: false }
  }

  try {
    const snap = await getDoc(hDoc('config', 'tipoCambio'))
    if (!snap.exists()) throw new Error('Documento tipoCambio no encontrado en Firestore')

    const data = snap.data() as TipoCambioARI
    if (!data.compra || !data.venta) throw new Error('Datos incompletos en Firestore')

    escribirCache(data.compra, data.venta, data.fuente)
    return { compra: data.compra, venta: data.venta, fuente: data.fuente, actualizadoEn: Date.now(), esNuevo: true }
  } catch {
    if (cache) {
      return { compra: cache.compra, venta: cache.venta, fuente: cache.fuente, actualizadoEn: cache.guardadoEn, esNuevo: false }
    }
    return {
      compra:        TIPO_CAMBIO_COMPRA_DEFAULT,
      venta:         TIPO_CAMBIO_VENTA_DEFAULT,
      fuente:        'Valor estimado (sin conexión)',
      actualizadoEn: 0,
      esNuevo:       false,
    }
  }
}
