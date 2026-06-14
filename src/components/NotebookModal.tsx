import { useEffect, useRef, useState } from 'react'
import type { PageStyle } from '@/types'
import { CoverImage } from '@/components/CoverImage'

export interface NotebookFormData {
  title: string
  style: PageStyle
  /** A newly chosen cover file, or null if none chosen this session. */
  cover: File | null
  /** True when the user removed an existing cover without choosing a new one. */
  removeCover: boolean
}

interface Props {
  mode: 'create' | 'edit'
  initial?: { title: string; style: PageStyle; coverId?: string }
  onSubmit: (data: NotebookFormData) => void
  onCancel: () => void
}

export function NotebookModal({ mode, initial, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [style, setStyle] = useState<PageStyle>(initial?.style ?? 'ruled')
  const [cover, setCover] = useState<File | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [removedExisting, setRemovedExisting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<string | null>(null)

  const chooseCover = (file: File | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = file ? URL.createObjectURL(file) : null
    setCoverUrl(urlRef.current)
    setCover(file)
    if (file) setRemovedExisting(false)
  }

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  const submit = () => {
    if (submitting) return
    setSubmitting(true)
    onSubmit({
      title: title.trim() || 'Untitled notebook',
      style,
      cover,
      removeCover: removedExisting && !cover,
    })
  }

  const hasExistingCover = !!initial?.coverId && !removedExisting
  const openPicker = () => fileRef.current?.click()

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{mode === 'edit' ? 'Edit notebook' : 'New notebook'}</h2>

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
            // A newly chosen image
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
              <button className="cover-change" onClick={openPicker}>
                Replace
              </button>
            </div>
          ) : hasExistingCover ? (
            // The notebook's current cover
            <div className="cover-preview-wrap">
              <CoverImage coverId={initial!.coverId!} alt="Current cover" className="cover-preview" />
              <button
                className="cover-remove"
                onClick={() => setRemovedExisting(true)}
                aria-label="Remove cover"
              >
                ✕
              </button>
              <button className="cover-change" onClick={openPicker}>
                Replace
              </button>
            </div>
          ) : (
            <button className="cover-drop" type="button" onClick={openPicker}>
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
            {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
