interface Props {
  current: number // 1-based
  total: number
  onPrev: () => void
  onNext: () => void
  onAddPage: () => void
}

export function PageNavigator({ current, total, onPrev, onNext, onAddPage }: Props) {
  const atStart = current <= 1
  const atEnd = current >= total

  return (
    <div className="pagenav">
      <button className="pagenav-btn" onClick={onPrev} disabled={atStart} aria-label="Previous page">
        ‹
      </button>
      <span className="pagenav-label">
        Page {current} <span className="pagenav-of">of {total}</span>
      </span>
      {atEnd ? (
        <button className="pagenav-btn pagenav-add" onClick={onAddPage} aria-label="Add page">
          +
        </button>
      ) : (
        <button className="pagenav-btn" onClick={onNext} aria-label="Next page">
          ›
        </button>
      )}
    </div>
  )
}
