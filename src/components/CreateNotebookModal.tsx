import { useState } from 'react'
import type { PageStyle } from '@/types'

interface Props {
  onCreate: (title: string, style: PageStyle) => void
  onCancel: () => void
}

export function CreateNotebookModal({ onCreate, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [style, setStyle] = useState<PageStyle>('ruled')
  const [submitting, setSubmitting] = useState(false)

  const submit = () => {
    if (submitting) return
    setSubmitting(true)
    onCreate(title.trim() || 'Untitled notebook', style)
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">New notebook</h2>

        <label className="field">
          <span className="field-label">Title</span>
          <input
            className="field-input"
            value={title}
            autoFocus
            placeholder="e.g. Physics — Term 2"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>

        <div className="field">
          <span className="field-label">Page style</span>
          <div className="style-choice">
            <button
              type="button"
              className={`style-option ${style === 'ruled' ? 'is-selected' : ''}`}
              onClick={() => setStyle('ruled')}
            >
              <span className="style-preview style-preview-ruled" aria-hidden="true" />
              Ruled
            </button>
            <button
              type="button"
              className={`style-option ${style === 'blank' ? 'is-selected' : ''}`}
              onClick={() => setStyle('blank')}
            >
              <span className="style-preview style-preview-blank" aria-hidden="true" />
              Blank
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
