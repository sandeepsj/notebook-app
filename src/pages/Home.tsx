import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useGuard } from '@/hooks/useGuard'
import {
  listNotebooks,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  uploadCover,
} from '@/services/drive'
import type { NotebookMeta, PageStyle } from '@/types'
import { CreateNotebookModal } from '@/components/CreateNotebookModal'
import { NotebookCard } from '@/components/NotebookCard'

function firstName(name: string): string {
  return name?.trim().split(/\s+/)[0] || 'Your'
}

export function Home() {
  const { auth, signOut } = useAuth()
  const token = auth!.accessToken
  const navigate = useNavigate()
  const { guard, error } = useGuard()

  const [notebooks, setNotebooks] = useState<NotebookMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Fetch the notebook list. Sets state only after awaiting (no synchronous
  // setState in the mount effect). `loading` starts true, so the initial load
  // shows the spinner without an extra setState.
  const load = useCallback(async () => {
    const list = await guard(() => listNotebooks(token))
    if (list) setNotebooks(list)
    setLoading(false)
  }, [guard, token])

  useEffect(() => {
    // Legitimate on-mount data fetch: state is only set after awaiting the
    // network call. No Suspense data layer here (frameworkless SPA), so an
    // effect is the right tool.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  // Retry from a user gesture — setting loading here (not in an effect) is fine.
  const retry = () => {
    setLoading(true)
    void load()
  }

  const handleCreate = async (title: string, style: PageStyle, cover: File | null) => {
    const created = await guard(() => createNotebook(token, title, style))
    if (created && cover) {
      await guard(() => uploadCover(token, created.id, cover))
    }
    setCreating(false)
    if (created) navigate(`/notebook/${created.id}`)
  }

  const handleRename = async (id: string, title: string) => {
    await guard(() => updateNotebook(token, id, { title }))
    setNotebooks((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)))
  }

  const handleDelete = async (id: string) => {
    await guard(() => deleteNotebook(token, id))
    setNotebooks((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="home">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            📓
          </span>
          <span className="brand-name">Notebook</span>
        </div>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + New notebook
          </button>
          <button className="avatar-btn" onClick={signOut} title={`Sign out ${auth!.user.email}`}>
            {auth!.user.picture ? (
              <img src={auth!.user.picture} alt={auth!.user.name} className="avatar" />
            ) : (
              <span className="avatar avatar-fallback">
                {auth!.user.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="home-head">
          <span className="home-sub">{firstName(auth!.user.name)}’s shelf</span>
          <h1 className="home-title">Your notebooks</h1>
        </div>

        {error && (
          <div className="banner banner-error">
            {error}
            <button className="btn btn-ghost" onClick={retry}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="state-msg">Loading your notebooks…</div>
        ) : notebooks.length === 0 ? (
          <div className="empty">
            <div className="empty-art" aria-hidden="true">
              📓
            </div>
            <h2 className="empty-title">Your shelf is empty</h2>
            <p className="empty-sub">Create your first notebook to start writing.</p>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              + New notebook
            </button>
          </div>
        ) : (
          <div className="shelf">
            {notebooks.map((nb) => (
              <NotebookCard
                key={nb.id}
                notebook={nb}
                onOpen={() => navigate(`/notebook/${nb.id}`)}
                onRename={(title) => handleRename(nb.id, title)}
                onDelete={() => handleDelete(nb.id)}
              />
            ))}
          </div>
        )}
      </main>

      {creating && (
        <CreateNotebookModal
          onCreate={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  )
}
