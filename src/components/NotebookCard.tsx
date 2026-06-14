import { useEffect, useRef, useState } from 'react'
import type { NotebookMeta } from '@/types'
import { CoverImage } from '@/components/CoverImage'

interface Props {
  notebook: NotebookMeta
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

const TONES = ['', 'tone-honey', 'tone-sage', 'tone-indigo']

/** Pick a stable default-cover tone from the title. */
function toneFor(title: string): string {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h + title.charCodeAt(i)) % TONES.length
  return TONES[h]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function NotebookCard({ notebook, onOpen, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <div className="book">
      <button className="book-cover" onClick={onOpen} aria-label={`Open ${notebook.title}`}>
        {notebook.coverId ? (
          <CoverImage coverId={notebook.coverId} alt={notebook.title} />
        ) : (
          <div className={`book-cover-default ${toneFor(notebook.title)}`}>
            <div className="book-label">
              <span className="book-label-title">{notebook.title}</span>
            </div>
          </div>
        )}
      </button>

      <div className="book-body">
        <button className="book-title" onClick={onOpen}>
          {notebook.title}
        </button>
        <div className="book-meta">
          <span>
            {notebook.pageCount} {notebook.pageCount === 1 ? 'page' : 'pages'}
          </span>
          {formatDate(notebook.updatedAt) && (
            <>
              <span className="book-dot">·</span>
              <span>{formatDate(notebook.updatedAt)}</span>
            </>
          )}
        </div>
      </div>

      <div className="book-menu" ref={menuRef}>
        <button
          className="book-menu-btn"
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
                onEdit()
              }}
            >
              Edit name &amp; cover
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
