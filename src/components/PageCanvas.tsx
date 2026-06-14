import { useRef, useState } from 'react'
import type { PageStyle, Stroke } from '@/types'
import {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  RULE_SPACING,
  strokePath,
  strokeOpacity,
} from '@/lib/freehand'

export type ToolKind = 'pen' | 'highlighter' | 'sketch' | 'eraser'

interface Props {
  style: PageStyle
  ink: Stroke[]
  sketch: Stroke[]
  tool: ToolKind
  color: string
  size: number
  onAddStroke: (stroke: Stroke) => void
  onEraseStroke: (stroke: Stroke) => void
}

const ERASE_RADIUS = 18 // page units

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

export function PageCanvas({
  style,
  ink,
  sketch,
  tool,
  color,
  size,
  onAddStroke,
  onEraseStroke,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [live, setLive] = useState<Stroke | null>(null)
  const drawing = useRef(false)
  const erased = useRef<Set<Stroke>>(new Set())

  // Map a pointer event to logical page coordinates.
  const toPage = (e: React.PointerEvent): [number, number, number] => {
    const rect = svgRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * PAGE_WIDTH
    const y = ((e.clientY - rect.top) / rect.height) * PAGE_HEIGHT
    const pressure = e.pressure > 0 ? e.pressure : 0.5
    return [x, y, pressure]
  }

  const eraseAt = (x: number, y: number) => {
    const r2 = ERASE_RADIUS * ERASE_RADIUS
    for (const stroke of [...ink, ...sketch]) {
      if (erased.current.has(stroke)) continue
      if (stroke.points.some((p) => dist2(p[0], p[1], x, y) <= r2)) {
        erased.current.add(stroke)
        onEraseStroke(stroke)
      }
    }
  }

  const handleDown = (e: React.PointerEvent) => {
    // Ignore secondary buttons / non-primary contacts.
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    svgRef.current?.setPointerCapture(e.pointerId)
    drawing.current = true
    const pt = toPage(e)

    if (tool === 'eraser') {
      erased.current = new Set()
      eraseAt(pt[0], pt[1])
      return
    }

    // tool is pen | highlighter | sketch here (eraser returned above).
    setLive({ points: [pt], color, size, tool })
  }

  const handleMove = (e: React.PointerEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const pt = toPage(e)

    if (tool === 'eraser') {
      eraseAt(pt[0], pt[1])
      return
    }
    setLive((prev) => (prev ? { ...prev, points: [...prev.points, pt] } : prev))
  }

  const handleUp = (e: React.PointerEvent) => {
    if (!drawing.current) return
    drawing.current = false
    svgRef.current?.releasePointerCapture(e.pointerId)

    if (tool === 'eraser') {
      erased.current = new Set()
      return
    }
    if (live && live.points.length > 0) onAddStroke(live)
    setLive(null)
  }

  const ruleLines: number[] = []
  if (style === 'ruled') {
    for (let y = RULE_SPACING * 2; y < PAGE_HEIGHT; y += RULE_SPACING) ruleLines.push(y)
  }

  return (
    <svg
      ref={svgRef}
      className={`page-canvas ${tool === 'eraser' ? 'is-erasing' : ''}`}
      viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      {/* Paper */}
      <rect x={0} y={0} width={PAGE_WIDTH} height={PAGE_HEIGHT} fill="#ffffff" />

      {/* Ruled lines */}
      {ruleLines.map((y) => (
        <line key={y} x1={0} y1={y} x2={PAGE_WIDTH} y2={y} stroke="var(--rule-line)" strokeWidth={1} />
      ))}

      {/* Sketch layer (under ink) */}
      {sketch.map((s, i) => (
        <path key={`s${i}`} d={strokePath(s)} fill={s.color} opacity={strokeOpacity(s.tool)} />
      ))}

      {/* Ink / handwriting layer */}
      {ink.map((s, i) => (
        <path key={`i${i}`} d={strokePath(s)} fill={s.color} opacity={strokeOpacity(s.tool)} />
      ))}

      {/* Live stroke */}
      {live && <path d={strokePath(live)} fill={live.color} opacity={strokeOpacity(live.tool)} />}
    </svg>
  )
}
