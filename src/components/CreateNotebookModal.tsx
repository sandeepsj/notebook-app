import { useEffect, useRef, useState } from 'react'
import type { PageStyle } from '@/types'

interface Props {
  onCreate: (title: string, style: PageStyle, cover: File | null) => void
  onCancel: () => void
}

export function CreateNotebookModal({ onCreate, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [style, setStyle] = useState<PageStyle>('ruled')
  const [cover, setCover] = useState<File | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<string | null>(null)

  // Set/replace the chosen cover and its preview URL (called from handlers, not
  // an effect). Revokes any previous object URL.
  const chooseCover = (file: File | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = file ? URL.createObjectURL(file) : null
    setCoverUrl(urlRef.current)
    setCover(file)
  }

  // Revoke the preview URL when the modal unmounts (no setState here).
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  const submit = () => {
    if (submitting) return
    setSubmitting(true)
    onCreate(title.trim() || 'Untitled notebook', style, cover)
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
          <span className="field-label">Cover</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => chooseCover(e.target.files?.[0] ?? null)}
          />
          {coverUrl ? (
            <div className="cover-preview-wrap">
              <img className="cover-preview" src={coverUrl} alt="Cover preview" />
              <button
                className="cover-remove"
                onClick={() => {
                  chooseCover(null)
                  if (fileRef.current) fileRef.current.value = ''
                }}
                aria-label="Remove cover"
              >
                ✕
              </button>
            </div>
          ) : (
            <button className="cover-drop" type="button" onClick={() => fileRef.current?.click()}>
              <span className="cover-drop-icon" aria-hidden="true">
                🖼
              </span>
              <span>Upload a cover image</span>
              <span className="cover-drop-hint">PNG or JPG — optional</span>
            </button>
          )}
        </div>

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
