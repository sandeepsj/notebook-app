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
  onChange: (strokes: Stroke[]) => void
  onRemove: () => void
}

type Tool = 'pen' | 'eraser'

const COLORS = ['#1f2333', '#2563eb', '#d4493f', '#15803d']
const SIZES = [4, 8, 16]
const ERASE_RADIUS = 16

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

/** A freehand drawing block for diagrams. Strokes are never converted to text. */
export function SketchBlock({ strokes, onChange, onRemove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState(SIZES[1])
  const [live, setLive] = useState<Stroke | null>(null)
  const drawing = useRef(false)
  const erased = useRef<Set<Stroke>>(new Set())

  const toPoint = (e: React.PointerEvent): [number, number, number] => {
    const rect = svgRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * SKETCH_WIDTH
    const y = ((e.clientY - rect.top) / rect.height) * SKETCH_HEIGHT
    return [x, y, e.pressure > 0 ? e.pressure : 0.5]
  }

  const eraseAt = (x: number, y: number) => {
    const r2 = ERASE_RADIUS * ERASE_RADIUS
    const survivors = strokes.filter((s) => {
      const hit = s.points.some((p) => dist2(p[0], p[1], x, y) <= r2)
      if (hit) erased.current.add(s)
      return !hit
    })
    if (survivors.length !== strokes.length) onChange(survivors)
  }

  const handleDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    svgRef.current?.setPointerCapture(e.pointerId)
    drawing.current = true
    const pt = toPoint(e)
    if (tool === 'eraser') {
      erased.current = new Set()
      eraseAt(pt[0], pt[1])
      return
    }
    setLive({ points: [pt], color, size, tool: 'pen' })
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
    if (tool === 'eraser') {
      erased.current = new Set()
      return
    }
    if (live && live.points.length > 0) onChange([...strokes, live])
    setLive(null)
  }

  return (
    <div className="sketch-block">
      <div className="sketch-bar">
        <div className="sketch-tools">
          <button
            className={`mini-btn ${tool === 'pen' ? 'is-active' : ''}`}
            onClick={() => setTool('pen')}
            title="Pen"
          >
            ✒️
          </button>
          <button
            className={`mini-btn ${tool === 'eraser' ? 'is-active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Eraser"
          >
            🧽
          </button>
          <span className="sketch-sep" />
          {COLORS.map((c) => (
            <button
              key={c}
              className={`mini-swatch ${color === c && tool === 'pen' ? 'is-active' : ''}`}
              style={{ background: c }}
              onClick={() => {
                setColor(c)
                setTool('pen')
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

      <svg
        ref={svgRef}
        className={`sketch-canvas ${tool === 'eraser' ? 'is-erasing' : ''}`}
        viewBox={`0 0 ${SKETCH_WIDTH} ${SKETCH_HEIGHT}`}
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
    </div>
  )
}
