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
  removeCover,
  deleteFile,
} from '@/services/drive'
import type { NotebookMeta } from '@/types'
import { NotebookModal, type NotebookFormData } from '@/components/NotebookModal'
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
  const [editing, setEditing] = useState<NotebookMeta | null>(null)

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

  const handleCreate = async (data: NotebookFormData) => {
    const created = await guard(() => createNotebook(token, data.title, data.style))
    if (created && data.cover) {
      await guard(() => uploadCover(token, created.id, data.cover!))
    }
    setCreating(false)
    if (created) navigate(`/notebook/${created.id}`)
  }

  const handleEdit = async (nb: NotebookMeta, data: NotebookFormData) => {
    setEditing(null)
    if (data.title !== nb.title || data.style !== nb.style) {
      await guard(() => updateNotebook(token, nb.id, { title: data.title, style: data.style }))
    }
    let coverId = nb.coverId
    if (data.cover) {
      const newId = await guard(() => uploadCover(token, nb.id, data.cover!))
      if (newId) {
        if (nb.coverId) await guard(() => deleteFile(token, nb.coverId!))
        coverId = newId
      }
    } else if (data.removeCover && nb.coverId) {
      await guard(() => removeCover(token, nb.id, nb.coverId!))
      coverId = undefined
    }
    setNotebooks((prev) =>
      prev.map((n) =>
        n.id === nb.id ? { ...n, title: data.title, style: data.style, coverId } : n,
      ),
    )
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
                onEdit={() => setEditing(nb)}
                onDelete={() => handleDelete(nb.id)}
              />
            ))}
          </div>
        )}
      </main>

      {creating && (
        <NotebookModal mode="create" onSubmit={handleCreate} onCancel={() => setCreating(false)} />
      )}

      {editing && (
        <NotebookModal
          mode="edit"
          initial={{ title: editing.title, style: editing.style, coverId: editing.coverId }}
          onSubmit={(data) => handleEdit(editing, data)}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}
