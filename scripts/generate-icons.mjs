/**
 * Generates pwa-192x192.png, pwa-512x512.png, and apple-touch-icon.png
 * using only Node.js built-ins (zlib + Buffer). No external dependencies.
 *
 * Design: dark background + violet rounded square + ₡ encoded as simple geometry.
 * Run: node scripts/generate-icons.mjs
 */

import { deflateSync } from 'zlib'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// ─── CRC32 ───────────────────────────────────────────────────────────────────

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// ─── PNG builder ─────────────────────────────────────────────────────────────

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(pixels, size) {
  // pixels: Uint8Array of size*size*4 (RGBA)
  // Convert to RGB scanlines with filter byte 0
  const rowLen = 1 + size * 3
  const raw = Buffer.alloc(rowLen * size)
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4
      const dst = y * rowLen + 1 + x * 3
      // Alpha-composite over black background
      const a = pixels[src + 3] / 255
      raw[dst]     = Math.round(pixels[src]     * a)
      raw[dst + 1] = Math.round(pixels[src + 1] * a)
      raw[dst + 2] = Math.round(pixels[src + 2] * a)
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ─── Icon renderer ───────────────────────────────────────────────────────────

// Colors
const BG    = [10,  10,  10,  255]  // #0a0a0a
const RING  = [124, 58,  237, 255]  // #7c3aed violet-600
const FILL  = [124, 58,  237, 38 ]  // violet-600 @ 15%

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

/** Smooth edge: returns 0..1 based on distance from boundary (for anti-aliasing) */
function edgeAlpha(d, radius, width = 1.5) {
  return Math.max(0, Math.min(1, (radius - d) / width + 0.5))
}

function blendOver(src, dst, alpha) {
  // src over dst
  return Math.round(src * alpha + dst * (1 - alpha))
}

function renderIcon(size) {
  const px = new Uint8Array(size * size * 4)
  const cx = size / 2, cy = size / 2

  const outerR  = size * 0.328   // ring radius (~168/512)
  const ringW   = size * 0.039   // ring stroke width (~20/512)
  const innerR  = size * 0.234   // inner fill radius (~120/512)

  // ─── Font-based "₡" pixel map at various scales ───────────────────────────
  // We approximate the Colón symbol with simple geometric shapes:
  //   - Vertical bar (rounded rect)
  //   - Two horizontal dashes
  //   - A "C" arc

  // Pixel coord helpers
  function setPixel(x, y, color, alpha = 1) {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const i = (Math.round(y) * size + Math.round(x)) * 4
    const a = alpha * (color[3] / 255)
    px[i]     = blendOver(color[0], px[i],     a)
    px[i + 1] = blendOver(color[1], px[i + 1], a)
    px[i + 2] = blendOver(color[2], px[i + 2], a)
    px[i + 3] = Math.min(255, px[i + 3] + Math.round(a * 255))
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      px[i] = BG[0]; px[i+1] = BG[1]; px[i+2] = BG[2]; px[i+3] = BG[3]
    }
  }

  // Draw inner fill circle
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = dist(x, y, cx, cy)
      if (d < innerR) {
        const a = edgeAlpha(d, innerR) * (FILL[3] / 255)
        const i = (y * size + x) * 4
        px[i]     = blendOver(FILL[0], px[i],     a)
        px[i + 1] = blendOver(FILL[1], px[i + 1], a)
        px[i + 2] = blendOver(FILL[2], px[i + 2], a)
        px[i + 3] = Math.min(255, px[i + 3] + Math.round(a * 255))
      }
    }
  }

  // Draw outer ring
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = dist(x, y, cx, cy)
      const ringInner = outerR - ringW / 2
      const ringOuter = outerR + ringW / 2
      if (d >= ringInner - 2 && d <= ringOuter + 2) {
        const alpha = Math.min(
          edgeAlpha(d, ringOuter + 0.5),
          edgeAlpha(ringInner - 0.5, d)
        ) * (RING[3] / 255)
        if (alpha > 0) {
          const i = (y * size + x) * 4
          px[i]     = blendOver(RING[0], px[i],     alpha)
          px[i + 1] = blendOver(RING[1], px[i + 1], alpha)
          px[i + 2] = blendOver(RING[2], px[i + 2], alpha)
          px[i + 3] = Math.min(255, px[i + 3] + Math.round(alpha * 255))
        }
      }
    }
  }

  // Draw "C" arc for Colón symbol
  const arcR    = size * 0.148  // ~76/512
  const arcStroke = size * 0.047  // ~24/512
  const arcCx  = cx + size * 0.012
  const arcCy  = cy + size * 0.020
  const gapDeg = 55  // degrees of gap on the right side

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - arcCx, dy = y - arcCy
      const d = Math.sqrt(dx * dx + dy * dy)
      const arcInner = arcR - arcStroke / 2
      const arcOuter = arcR + arcStroke / 2
      if (d >= arcInner - 2 && d <= arcOuter + 2) {
        const angleDeg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360
        // Gap on the right: -gapDeg/2 to +gapDeg/2 (i.e. 360-gap/2 to gap/2)
        const inGap = angleDeg > (360 - gapDeg / 2) || angleDeg < gapDeg / 2
        if (!inGap) {
          const alpha = Math.min(
            edgeAlpha(d, arcOuter + 0.5),
            edgeAlpha(arcInner - 0.5, d)
          ) * (RING[3] / 255)
          if (alpha > 0) {
            const i = (y * size + x) * 4
            px[i]     = blendOver(RING[0], px[i],     alpha)
            px[i + 1] = blendOver(RING[1], px[i + 1], alpha)
            px[i + 2] = blendOver(RING[2], px[i + 2], alpha)
            px[i + 3] = Math.min(255, px[i + 3] + Math.round(alpha * 255))
          }
        }
      }
    }
  }

  // Vertical bar of ₡
  const barW  = arcStroke
  const barH  = arcR * 2.1
  const barX1 = arcCx - barW / 2
  const barY1 = arcCy - barH / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x >= barX1 && x <= barX1 + barW && y >= barY1 && y <= barY1 + barH) {
        const edgeX = Math.min(x - barX1, barX1 + barW - x, 1.5)
        const edgeY = Math.min(y - barY1, barY1 + barH - y, 1.5)
        const alpha = Math.min(edgeX, edgeY) / 1.5 * (RING[3] / 255)
        if (alpha > 0) {
          const i = (y * size + x) * 4
          px[i]     = blendOver(RING[0], px[i],     alpha)
          px[i + 1] = blendOver(RING[1], px[i + 1], alpha)
          px[i + 2] = blendOver(RING[2], px[i + 2], alpha)
          px[i + 3] = Math.min(255, px[i + 3] + Math.round(alpha * 255))
        }
      }
    }
  }

  // Two horizontal dashes of ₡
  const dashW  = arcR * 1.2
  const dashH  = arcStroke * 0.55
  const dashX1 = arcCx - dashW / 2
  for (const dashY1 of [arcCy - arcR * 0.28, arcCy + arcR * 0.28]) {
    for (let y = Math.floor(dashY1); y <= Math.ceil(dashY1 + dashH); y++) {
      for (let x = Math.floor(dashX1); x <= Math.ceil(dashX1 + dashW); x++) {
        if (x < 0 || x >= size || y < 0 || y >= size) continue
        const alpha = RING[3] / 255
        const i = (y * size + x) * 4
        px[i]     = blendOver(RING[0], px[i],     alpha)
        px[i + 1] = blendOver(RING[1], px[i + 1], alpha)
        px[i + 2] = blendOver(RING[2], px[i + 2], alpha)
        px[i + 3] = Math.min(255, px[i + 3] + Math.round(alpha * 255))
      }
    }
  }

  return makePNG(px, size)
}

// ─── Generate ─────────────────────────────────────────────────────────────────

const sizes = [
  { name: 'pwa-512x512.png',      size: 512 },
  { name: 'pwa-192x192.png',      size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  const buf = renderIcon(size)
  writeFileSync(join(publicDir, name), buf)
  console.log(`✓ ${name} (${buf.length} bytes)`)
}

console.log('\nIconos generados en public/')
