import { useEffect, useRef } from 'react'

interface Props {
  text: string
  placeholder?: string
  autoFocus?: boolean
  onChange: (text: string) => void
  /** Remove this block when the user backspaces in an already-empty block. */
  onRemoveEmpty?: () => void
}

/**
 * A plain auto-growing text area. All input methods — typing, the tablet's
 * native stylus handwriting, and speech-to-text — write directly into it; no
 * recognition layer is needed on our side.
 */
export function TextBlock({ text, placeholder, autoFocus, onChange, onRemoveEmpty }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Grow the textarea to fit its content.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  return (
    <textarea
      ref={ref}
      className="block-text"
      value={text}
      rows={1}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' && text === '' && onRemoveEmpty) {
          e.preventDefault()
          onRemoveEmpty()
        }
      }}
    />
  )
}
