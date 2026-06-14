import { useNavigate, useParams } from 'react-router-dom'

// Placeholder — the page editor (stylus canvas, sketch overlay, recognition,
// page navigator) is built in the next phase.
export function NotebookView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="notebook-view">
      <header className="topbar">
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          ← Notebooks
        </button>
      </header>
      <main className="state-msg">
        <p>Editor coming soon.</p>
        <p className="state-sub">Notebook id: {id}</p>
      </main>
    </div>
  )
}
