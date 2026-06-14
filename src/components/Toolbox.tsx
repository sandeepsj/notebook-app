import type { ToolKind } from '@/components/PageCanvas'

interface Props {
  tool: ToolKind
  setTool: (t: ToolKind) => void
  color: string
  setColor: (c: string) => void
  size: number
  setSize: (n: number) => void
  onUndo: () => void
  canUndo: boolean
}

const TOOLS: { kind: ToolKind; label: string; icon: string }[] = [
  { kind: 'pen', label: 'Pen', icon: '✒️' },
  { kind: 'highlighter', label: 'Highlighter', icon: '🖍️' },
  { kind: 'sketch', label: 'Sketch', icon: '✏️' },
  { kind: 'eraser', label: 'Eraser', icon: '🧽' },
]

const COLORS = ['#1f2333', '#2563eb', '#d4493f', '#15803d', '#f59e0b', '#9333ea']
const SIZES = [4, 8, 14, 22]

export function Toolbox({ tool, setTool, color, setColor, size, setSize, onUndo, canUndo }: Props) {
  const drawingTool = tool !== 'eraser'

  return (
    <div className="toolbox">
      <div className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.kind}
            className={`tool-btn ${tool === t.kind ? 'is-active' : ''}`}
            onClick={() => setTool(t.kind)}
            title={t.label}
            aria-pressed={tool === t.kind}
          >
            <span aria-hidden="true">{t.icon}</span>
          </button>
        ))}
      </div>

      <div className="tool-sep" />

      <div className={`tool-group ${drawingTool ? '' : 'is-disabled'}`}>
        {COLORS.map((c) => (
          <button
            key={c}
            className={`swatch ${color === c && drawingTool ? 'is-active' : ''}`}
            style={{ background: c }}
            onClick={() => {
              setColor(c)
              if (tool === 'eraser') setTool('pen')
            }}
            title={c}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>

      <div className="tool-sep" />

      <div className="tool-group">
        {SIZES.map((s) => (
          <button
            key={s}
            className={`size-btn ${size === s ? 'is-active' : ''}`}
            onClick={() => setSize(s)}
            title={`Size ${s}`}
            aria-label={`Stroke size ${s}`}
          >
            <span className="size-dot" style={{ width: s, height: s }} />
          </button>
        ))}
      </div>

      <div className="tool-sep" />

      <button className="tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo">
        <span aria-hidden="true">↶</span>
      </button>
    </div>
  )
}
