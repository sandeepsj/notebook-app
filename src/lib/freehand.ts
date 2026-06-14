import { getStroke } from 'perfect-freehand'
import type { Stroke } from '@/types'

/** Logical page dimensions (≈ A4 ratio). Strokes are stored in these units. */
export const PAGE_WIDTH = 1000
export const PAGE_HEIGHT = 1414
/** Spacing for ruled lines, in page units. */
export const RULE_SPACING = 44

type FreehandOptions = Parameters<typeof getStroke>[1]

const TOOL_OPTIONS: Record<Stroke['tool'], FreehandOptions> = {
  pen: { thinning: 0.6, smoothing: 0.5, streamline: 0.5, simulatePressure: true },
  // Highlighter: flatter, less pressure variation, drawn semi-transparent.
  highlighter: { thinning: 0.1, smoothing: 0.4, streamline: 0.4, simulatePressure: false },
  // Free sketch: expressive, pressure-aware.
  sketch: { thinning: 0.7, smoothing: 0.55, streamline: 0.45, simulatePressure: true },
}

/** Convert a freehand outline (list of points) into an SVG path `d` string. */
function outlineToPath(points: number[][]): string {
  if (points.length === 0) return ''
  const d = points.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', points[0][0], points[0][1], 'Q'] as (string | number)[],
  )
  d.push('Z')
  return d.join(' ')
}

/** Build the SVG path `d` for a stored stroke. */
export function strokePath(stroke: Stroke): string {
  const outline = getStroke(stroke.points, {
    size: stroke.size,
    ...TOOL_OPTIONS[stroke.tool],
  })
  return outlineToPath(outline)
}

/** Opacity for a given tool (highlighter is translucent). */
export function strokeOpacity(tool: Stroke['tool']): number {
  return tool === 'highlighter' ? 0.4 : 1
}
