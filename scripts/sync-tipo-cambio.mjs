/**
 * Fetches ARI Casa de Cambio rates from BCCR ventanilla page and writes
 * compra/venta to Firestore. Runs daily via GitHub Actions.
 *
 * Requires env vars:
 *   FIREBASE_SERVICE_ACCOUNT — JSON string of service account key
 *   FIREBASE_PROJECT_ID      — Firebase project ID
 *   HOUSEHOLD_ID             — households/{id} document scope
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore }                  from 'firebase-admin/firestore'

const BCCR_URL = 'https://gee.bccr.fi.cr/IndicadoresEconomicos/Cuadros/frmConsultaTCVentanilla.aspx'
const ARI_NAME = 'ARI Casa de Cambio Internacional S.A.'

// ── Firebase init ────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) })
}
const db          = getFirestore()
const householdId = process.env.HOUSEHOLD_ID

// ── Fetch BCCR page ───────────────────────────────────────────────────────────

console.log('Fetching BCCR ventanilla page…')
const res = await fetch(BCCR_URL, { signal: AbortSignal.timeout(15_000) })
if (!res.ok) throw new Error(`BCCR fetch failed: HTTP ${res.status}`)
const html = await res.text()

// ── Parse ARI row ────────────────────────────────────────────────────────────
// The HTML has rows like:
//   <td>ARI Casa de Cambio Internacional S.A. </td><td>450,85</td><td>456,72</td>

const escapedName = ARI_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Match the name cell, then skip whitespace/tags to get Compra and Venta cells
const rowPattern = new RegExp(
  escapedName +
  '\\s*<\\/font>[\\s\\S]*?<td[^>]*><font[^>]*>([0-9.,]+)<\\/font>[\\s\\S]*?' +
  '<td[^>]*><font[^>]*>([0-9.,]+)<\\/font>'
)

const match = html.match(rowPattern)
if (!match) throw new Error(`No se encontró "${ARI_NAME}" en la página del BCCR`)

// Costa Rica uses comma as decimal separator in this page: "450,85"
const parseRate = (s) => parseFloat(s.replace(',', '.'))
const compra = parseRate(match[1])
const venta  = parseRate(match[2])

if (isNaN(compra) || isNaN(venta)) throw new Error(`Tasas inválidas: compra=${match[1]} venta=${match[2]}`)

console.log(`ARI: Compra ₡${compra} | Venta ₡${venta}`)

// ── Write to Firestore ────────────────────────────────────────────────────────

const docRef = db.doc(`households/${householdId}/config/tipoCambio`)
await docRef.set({
  compra,
  venta,
  fuente:             ARI_NAME,
  fechaActualizacion: new Date().toISOString(),
})

console.log('✓ Tipo de cambio actualizado en Firestore.')
