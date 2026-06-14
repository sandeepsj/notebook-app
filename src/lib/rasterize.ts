import type { Stroke } from '@/types'
import { PAGE_WIDTH, PAGE_HEIGHT, strokePath, strokeOpacity } from '@/lib/freehand'

/**
 * Render a set of strokes onto a white page and return the PNG as base64
 * (no data-URL prefix), ready to send to a vision model. Reuses the same
 * freehand outline as the on-screen canvas — `new Path2D(d)` accepts the
 * SVG path string `strokePath` produces.
 */
export function rasterizeStrokes(strokes: Stroke[]): string {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH
  canvas.height = PAGE_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  for (const stroke of strokes) {
    ctx.fillStyle = stroke.color
    ctx.globalAlpha = strokeOpacity(stroke.tool)
    ctx.fill(new Path2D(strokePath(stroke)))
  }
  ctx.globalAlpha = 1

  return canvas.toDataURL('image/png').split(',')[1]
}
