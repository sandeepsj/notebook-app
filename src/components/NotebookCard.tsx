import { useEffect, useRef, useState } from 'react'
import type { NotebookMeta } from '@/types'

interface Props {
  notebook: NotebookMeta
  onOpen: () => void
  onRename: (title: string) => void
  onDelete: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function NotebookCard({ notebook, onOpen, onRename, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(notebook.title)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const commitRename = () => {
    const title = draft.trim()
    if (title && title !== notebook.title) onRename(title)
    else setDraft(notebook.title)
    setEditing(false)
  }

  return (
    <div className="card">
      <button
        className={`card-cover card-cover-${notebook.style}`}
        onClick={onOpen}
        aria-label={`Open ${notebook.title}`}
      >
        <span className="card-cover-spine" aria-hidden="true" />
      </button>

      <div className="card-body">
        {editing ? (
          <input
            className="card-title-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setDraft(notebook.title)
                setEditing(false)
              }
            }}
          />
        ) : (
          <button className="card-title" onClick={onOpen}>
            {notebook.title}
          </button>
        )}
        <div className="card-meta">
          <span>{notebook.pageCount} {notebook.pageCount === 1 ? 'page' : 'pages'}</span>
          <span className="card-dot">·</span>
          <span>{notebook.style === 'ruled' ? 'Ruled' : 'Blank'}</span>
          {formatDate(notebook.updatedAt) && (
            <>
              <span className="card-dot">·</span>
              <span>{formatDate(notebook.updatedAt)}</span>
            </>
          )}
        </div>
      </div>

      <div className="card-menu" ref={menuRef}>
        <button
          className="card-menu-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Notebook actions"
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="menu-popover">
            <button
              className="menu-item"
              onClick={() => {
                setMenuOpen(false)
                setEditing(true)
              }}
            >
              Rename
            </button>
            <button
              className="menu-item menu-item-danger"
              onClick={() => {
                setMenuOpen(false)
                if (confirm(`Delete "${notebook.title}"? This cannot be undone.`)) onDelete()
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
