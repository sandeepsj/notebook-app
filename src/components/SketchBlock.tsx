import { useRef, useState } from 'react'
import type { Stroke } from '@/types'
import {
  SKETCH_WIDTH,
  SKETCH_HEIGHT,
  strokePath,
  strokeOpacity,
} from '@/lib/freehand'

interface Props {
  strokes: Stroke[]
  width?: number
  height?: number
  onChange: (strokes: Stroke[]) => void
  onResize: (width: number, height: number) => void
  onRemove: () => void
}

type Tool = 'pen' | 'pencil' | 'highlighter' | 'eraser'

const TOOLS: { kind: Tool; icon: string; label: string }[] = [
  { kind: 'pen', icon: '✒️', label: 'Pen' },
  { kind: 'pencil', icon: '✏️', label: 'Pencil' },
  { kind: 'highlighter', icon: '🖍️', label: 'Highlighter' },
  { kind: 'eraser', icon: '🧽', label: 'Eraser' },
]

const COLORS = ['#1f2333', '#2563eb', '#d4493f', '#15803d', '#e0a73f']
const SIZES = [4, 8, 16, 26]
const ERASE_RADIUS = 16
const DEFAULT_HEIGHT = 300
const MIN_W = 240
const MIN_H = 160

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

/** A resizable freehand drawing block for diagrams. Never converted to text. */
export function SketchBlock({ strokes, width, height, onChange, onResize, onRemove }: Props) {
  const blockRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState(SIZES[1])
  const [live, setLive] = useState<Stroke | null>(null)
  const [dims, setDims] = useState<{ w?: number; h: number }>({ w: width, h: height ?? DEFAULT_HEIGHT })
  const drawing = useRef(false)
  const resizing = useRef(false)

  const toPoint = (e: React.PointerEvent): [number, number, number] => {
    const rect = svgRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * SKETCH_WIDTH
    const y = ((e.clientY - rect.top) / rect.height) * SKETCH_HEIGHT
    return [x, y, e.pressure > 0 ? e.pressure : 0.5]
  }

  const eraseAt = (x: number, y: number) => {
    const r2 = ERASE_RADIUS * ERASE_RADIUS
    const survivors = strokes.filter((s) => !s.points.some((p) => dist2(p[0], p[1], x, y) <= r2))
    if (survivors.length !== strokes.length) onChange(survivors)
  }

  const handleDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    svgRef.current?.setPointerCapture(e.pointerId)
    drawing.current = true
    const pt = toPoint(e)
    if (tool === 'eraser') {
      eraseAt(pt[0], pt[1])
      return
    }
    setLive({ points: [pt], color, size, tool })
  }

  const handleMove = (e: React.PointerEvent) => {
    if (!drawing.current) return
    e.preventDefault()
    const pt = toPoint(e)
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
    if (tool !== 'eraser' && live && live.points.length > 0) onChange([...strokes, live])
    setLive(null)
  }

  // ---- Resize --------------------------------------------------------------
  const resizeMove = (e: React.PointerEvent) => {
    if (!resizing.current || !blockRef.current || !svgRef.current) return
    const blockRect = blockRef.current.getBoundingClientRect()
    const svgTop = svgRef.current.getBoundingClientRect().top
    const w = clamp(e.clientX - blockRect.left, MIN_W, 1600)
    const h = clamp(e.clientY - svgTop, MIN_H, 1400)
    setDims({ w, h })
  }
  const resizeDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    resizing.current = true
  }
  const resizeUp = (e: React.PointerEvent) => {
    if (!resizing.current) return
    resizing.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    onResize(dims.w ?? blockRef.current?.getBoundingClientRect().width ?? MIN_W, dims.h)
  }

  const drawingTool = tool !== 'eraser'

  return (
    <div
      className="sketch-block"
      ref={blockRef}
      style={{ width: dims.w ? `${dims.w}px` : '100%' }}
    >
      <div className="sketch-bar">
        <div className="sketch-tools">
          {TOOLS.map((t) => (
            <button
              key={t.kind}
              className={`mini-btn ${tool === t.kind ? 'is-active' : ''}`}
              onClick={() => setTool(t.kind)}
              title={t.label}
              aria-pressed={tool === t.kind}
            >
              {t.icon}
            </button>
          ))}
          <span className="sketch-sep" />
          {COLORS.map((c) => (
            <button
              key={c}
              className={`mini-swatch ${color === c && drawingTool ? 'is-active' : ''}`}
              style={{ background: c }}
              onClick={() => {
                setColor(c)
                if (tool === 'eraser') setTool('pen')
              }}
              aria-label={`Colour ${c}`}
            />
          ))}
          <span className="sketch-sep" />
          {SIZES.map((s) => (
            <button
              key={s}
              className={`mini-size ${size === s ? 'is-active' : ''}`}
              onClick={() => setSize(s)}
              aria-label={`Size ${s}`}
            >
              <span className="mini-dot" style={{ width: s, height: s }} />
            </button>
          ))}
        </div>
        <button className="mini-btn mini-remove" onClick={onRemove} title="Delete sketch">
          🗑
        </button>
      </div>

      <div className="sketch-canvas-wrap">
        <svg
          ref={svgRef}
          className={`sketch-canvas ${tool === 'eraser' ? 'is-erasing' : ''}`}
          viewBox={`0 0 ${SKETCH_WIDTH} ${SKETCH_HEIGHT}`}
          preserveAspectRatio="none"
          style={{ height: `${dims.h}px` }}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
        >
          <rect x={0} y={0} width={SKETCH_WIDTH} height={SKETCH_HEIGHT} fill="#fff" />
          {strokes.map((s, i) => (
            <path key={i} d={strokePath(s)} fill={s.color} opacity={strokeOpacity(s.tool)} />
          ))}
          {live && <path d={strokePath(live)} fill={live.color} opacity={strokeOpacity(live.tool)} />}
        </svg>
        <div
          className="sketch-resize"
          title="Drag to resize"
          onPointerDown={resizeDown}
          onPointerMove={resizeMove}
          onPointerUp={resizeUp}
          onPointerCancel={resizeUp}
        />
      </div>
    </div>
  )
}
