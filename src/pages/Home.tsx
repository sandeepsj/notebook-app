import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  listNotebooks,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  UnauthorizedError,
} from '@/services/drive'
import type { NotebookMeta, PageStyle } from '@/types'
import { CreateNotebookModal } from '@/components/CreateNotebookModal'
import { NotebookCard } from '@/components/NotebookCard'

export function Home() {
  const { auth, signOut, forceReauth } = useAuth()
  const token = auth!.accessToken
  const navigate = useNavigate()

  const [notebooks, setNotebooks] = useState<NotebookMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Wrap a Drive call so an expired token drops back to the login screen.
  // All setState happens after an await, so this is safe to call from an effect.
  const guard = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        const result = await fn()
        setError(null)
        return result
      } catch (e) {
        if (e instanceof UnauthorizedError) {
          forceReauth()
          return undefined
        }
        setError(e instanceof Error ? e.message : 'Something went wrong')
        return undefined
      }
    },
    [forceReauth],
  )

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

  const handleCreate = async (title: string, style: PageStyle) => {
    const created = await guard(() => createNotebook(token, title, style))
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
            ✎
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
            <h2 className="empty-title">No notebooks yet</h2>
            <p className="empty-sub">Create your first notebook to start writing.</p>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              + New notebook
            </button>
          </div>
        ) : (
          <div className="grid">
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
