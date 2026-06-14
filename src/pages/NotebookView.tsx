import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGuard } from '@/hooks/useGuard'
import { useAuth } from '@/hooks/useAuth'
import {
  getNotebook,
  listPageFiles,
  readPage,
  savePage,
  updateNotebook,
} from '@/services/drive'
import { recognizeHandwriting } from '@/services/recognize'
import type { NotebookMeta, Page, Stroke } from '@/types'
import { PageCanvas, type ToolKind } from '@/components/PageCanvas'
import { Toolbox } from '@/components/Toolbox'
import { PageNavigator } from '@/components/PageNavigator'

interface PageRef {
  id: string
  pageNumber: number
}

const AUTOSAVE_MS = 1200

function emptyPage(pageNumber: number): Page {
  return { id: '', pageNumber, ink: [], sketch: [], text: '', updatedAt: '' }
}

function isBlankUnsaved(p: Page): boolean {
  return !p.id && p.ink.length === 0 && p.sketch.length === 0 && p.text.trim() === ''
}

export function NotebookView() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const token = auth!.accessToken
  const { guard, error } = useGuard()

  const [meta, setMeta] = useState<NotebookMeta | null>(null)
  const [refs, setRefs] = useState<PageRef[]>([])
  const [index, setIndex] = useState(0)
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showText, setShowText] = useState(false)
  const [recognizing, setRecognizing] = useState(false)

  const [tool, setTool] = useState<ToolKind>('pen')
  const [color, setColor] = useState('#1f2333')
  const [size, setSize] = useState(8)

  // Mutable mirrors so callbacks always see the latest values without stale
  // closures. `pageRef` mirrors `page`; `cache` keeps loaded/edited pages.
  const pageRef = useRef<Page | null>(null)
  const cache = useRef<Map<number, Page>>(new Map())
  const saveTimer = useRef<number | null>(null)
  const pendingSave = useRef<Page | null>(null)
  const undoStack = useRef<Page[]>([])
  const refsRef = useRef<PageRef[]>([])
  const [undoCount, setUndoCount] = useState(0)

  const applyPage = useCallback((p: Page | null) => {
    pageRef.current = p
    setPage(p)
  }, [])

  const setRefsBoth = useCallback((next: PageRef[]) => {
    refsRef.current = next
    setRefs(next)
  }, [])

  // ---- Saving --------------------------------------------------------------

  const doSave = useCallback(
    async (p: Page) => {
      if (isBlankUnsaved(p)) return
      setSaving(true)
      const newId = await guard(() => savePage(token, id, p))
      setSaving(false)
      if (!newId) return

      if (!p.id) {
        // Page was just persisted for the first time: assign its id, mark the
        // ref, and refresh the notebook's page count.
        const updated = { ...p, id: newId }
        cache.current.set(p.pageNumber, updated)
        if (pageRef.current?.pageNumber === p.pageNumber) applyPage(updated)

        const nextRefs = refsRef.current.map((r) =>
          r.pageNumber === p.pageNumber ? { ...r, id: newId } : r,
        )
        setRefsBoth(nextRefs)

        const count = nextRefs.filter((r) => r.id).length
        setMeta((m) => (m ? { ...m, pageCount: count } : m))
        void guard(() => updateNotebook(token, id, { pageCount: count }))
      }
    },
    [guard, token, id, applyPage, setRefsBoth],
  )

  const scheduleSave = useCallback(
    (p: Page) => {
      pendingSave.current = p
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        const toSave = pendingSave.current
        pendingSave.current = null
        saveTimer.current = null
        if (toSave) void doSave(toSave)
      }, AUTOSAVE_MS)
    },
    [doSave],
  )

  const flush = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const toSave = pendingSave.current
    pendingSave.current = null
    if (toSave) await doSave(toSave)
  }, [doSave])

  // ---- Mutations (with snapshot-based undo) --------------------------------

  const mutate = useCallback(
    (producer: (p: Page) => Page) => {
      const prev = pageRef.current
      if (!prev) return
      undoStack.current.push(prev)
      setUndoCount(undoStack.current.length)
      const next = producer(prev)
      cache.current.set(next.pageNumber, next)
      applyPage(next)
      scheduleSave(next)
    },
    [applyPage, scheduleSave],
  )

  const handleAddStroke = useCallback(
    (stroke: Stroke) => {
      mutate((p) =>
        stroke.tool === 'sketch'
          ? { ...p, sketch: [...p.sketch, stroke] }
          : { ...p, ink: [...p.ink, stroke] },
      )
    },
    [mutate],
  )

  const handleEraseStroke = useCallback(
    (stroke: Stroke) => {
      mutate((p) => ({
        ...p,
        ink: p.ink.filter((s) => s !== stroke),
        sketch: p.sketch.filter((s) => s !== stroke),
      }))
    },
    [mutate],
  )

  const handleUndo = useCallback(() => {
    const prev = undoStack.current.pop()
    setUndoCount(undoStack.current.length)
    if (!prev) return
    cache.current.set(prev.pageNumber, prev)
    applyPage(prev)
    scheduleSave(prev)
  }, [applyPage, scheduleSave])

  const handleTextChange = useCallback(
    (text: string) => {
      mutate((p) => ({ ...p, text }))
    },
    [mutate],
  )

  const handleRecognize = useCallback(async () => {
    const current = pageRef.current
    if (!current || current.ink.length === 0 || recognizing) return
    setShowText(true)
    setRecognizing(true)
    const recognized = await guard(() => recognizeHandwriting(token, current.ink))
    setRecognizing(false)
    if (recognized == null) return // error/401 already handled by guard
    if (recognized) {
      mutate((p) => ({ ...p, text: p.text ? `${p.text}\n${recognized}` : recognized }))
    }
  }, [guard, token, mutate, recognizing])

  // ---- Page loading / navigation ------------------------------------------

  const loadIndex = useCallback(
    async (idx: number, currentRefs: PageRef[]) => {
      undoStack.current = []
      setUndoCount(0)
      const ref = currentRefs[idx]
      if (!ref) return
      const cached = cache.current.get(ref.pageNumber)
      if (cached) {
        applyPage(cached)
        return
      }
      if (!ref.id) {
        const p = emptyPage(ref.pageNumber)
        cache.current.set(ref.pageNumber, p)
        applyPage(p)
        return
      }
      const loaded = await guard(() => readPage(token, ref.id))
      if (loaded) {
        cache.current.set(ref.pageNumber, loaded)
        applyPage(loaded)
      }
    },
    [applyPage, guard, token],
  )

  const goTo = useCallback(
    async (idx: number) => {
      if (idx < 0 || idx >= refsRef.current.length) return
      await flush()
      setIndex(idx)
      await loadIndex(idx, refsRef.current)
    },
    [flush, loadIndex],
  )

  const addPage = useCallback(async () => {
    await flush()
    const maxNum = refsRef.current.reduce((m, r) => Math.max(m, r.pageNumber), 0)
    const newRef: PageRef = { id: '', pageNumber: maxNum + 1 }
    const nextRefs = [...refsRef.current, newRef]
    setRefsBoth(nextRefs)
    const p = emptyPage(newRef.pageNumber)
    cache.current.set(newRef.pageNumber, p)
    undoStack.current = []
    setUndoCount(0)
    setIndex(nextRefs.length - 1)
    applyPage(p)
  }, [flush, setRefsBoth, applyPage])

  // ---- Initial load --------------------------------------------------------

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const m = await guard(() => getNotebook(token, id))
      const list = await guard(() => listPageFiles(token, id))
      if (cancelled) return
      if (m) setMeta(m)
      const initialRefs: PageRef[] = list && list.length ? list : [{ id: '', pageNumber: 1 }]
      setRefsBoth(initialRefs)
      setIndex(0)
      await loadIndex(0, initialRefs)
      setLoading(false)
    }
    // Legitimate on-mount fetch; state is set only after awaiting.
    void init()
    return () => {
      cancelled = true
    }
  }, [guard, token, id, setRefsBoth, loadIndex])

  // Flush any pending save when leaving the notebook.
  useEffect(() => {
    return () => {
      const toSave = pendingSave.current
      if (toSave && !isBlankUnsaved(toSave)) void savePage(token, id, toSave)
    }
  }, [token, id])

  const handleBack = async () => {
    await flush()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="notebook-view">
        <div className="state-msg">Loading notebook…</div>
      </div>
    )
  }

  return (
    <div className="notebook-view">
      <header className="editor-bar">
        <button className="btn btn-ghost" onClick={handleBack}>
          ← Notebooks
        </button>
        <h1 className="editor-title">{meta?.title ?? 'Notebook'}</h1>
        <div className="editor-bar-right">
          <span className={`save-state ${saving ? 'is-saving' : ''}`}>
            {saving ? 'Saving…' : 'Saved'}
          </span>
          <button
            className={`btn btn-ghost ${showText ? 'is-active' : ''}`}
            onClick={() => setShowText((v) => !v)}
          >
            {showText ? 'Hide text' : 'Text'}
          </button>
        </div>
      </header>

      {error && <div className="banner banner-error">{error}</div>}

      <Toolbox
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        onUndo={handleUndo}
        canUndo={undoCount > 0}
      />

      <div className="editor-stage">
        <div className="page-frame">
          {page && (
            <PageCanvas
              style={meta?.style ?? 'ruled'}
              ink={page.ink}
              sketch={page.sketch}
              tool={tool}
              color={color}
              size={size}
              onAddStroke={handleAddStroke}
              onEraseStroke={handleEraseStroke}
            />
          )}
        </div>

        {showText && (
          <aside className="text-panel">
            <div className="text-panel-head">
              <h2 className="text-panel-title">Text</h2>
              <button
                className="btn btn-primary text-recognize"
                onClick={() => void handleRecognize()}
                disabled={recognizing || !page || page.ink.length === 0}
                title="Transcribe the handwriting on this page into text"
              >
                {recognizing ? 'Recognizing…' : '✨ Recognize'}
              </button>
            </div>
            <textarea
              className="text-area"
              placeholder="Recognized or typed text for this page…"
              value={page?.text ?? ''}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </aside>
        )}
      </div>

      <PageNavigator
        current={index + 1}
        total={refs.length}
        onPrev={() => void goTo(index - 1)}
        onNext={() => void goTo(index + 1)}
        onAddPage={() => void addPage()}
      />
    </div>
  )
}
