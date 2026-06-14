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
import type { Block, NotebookMeta, Page, Stroke } from '@/types'
import { TextBlock } from '@/components/TextBlock'
import { SketchBlock } from '@/components/SketchBlock'
import { PageNavigator } from '@/components/PageNavigator'
import {
  UndoIcon,
  ChevronLeftIcon,
  TextIcon,
  SketchIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TrashIcon,
} from '@/components/icons'

interface PageRef {
  id: string
  pageNumber: number
}

const AUTOSAVE_MS = 1200

function newId(): string {
  return crypto.randomUUID()
}

function emptyTextBlock(): Block {
  return { kind: 'text', id: newId(), text: '' }
}

function emptyPage(pageNumber: number): Page {
  return { id: '', pageNumber, blocks: [emptyTextBlock()], updatedAt: '' }
}

function isBlockEmpty(b: Block): boolean {
  return b.kind === 'text' ? b.text.trim() === '' : b.strokes.length === 0
}

function isBlankUnsaved(p: Page): boolean {
  return !p.id && p.blocks.every(isBlockEmpty)
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

  // Mutable mirrors so callbacks always see the latest values.
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
      const newFileId = await guard(() => savePage(token, id, p))
      setSaving(false)
      if (!newFileId) return

      if (!p.id) {
        const updated = { ...p, id: newFileId }
        cache.current.set(p.pageNumber, updated)
        if (pageRef.current?.pageNumber === p.pageNumber) applyPage(updated)

        const nextRefs = refsRef.current.map((r) =>
          r.pageNumber === p.pageNumber ? { ...r, id: newFileId } : r,
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

  // ---- Mutations -----------------------------------------------------------

  // Apply a change and schedule a save, without recording an undo snapshot.
  // Used for text edits — the textarea has its own native undo.
  const applySilent = useCallback(
    (producer: (p: Page) => Page) => {
      const prev = pageRef.current
      if (!prev) return
      const next = producer(prev)
      cache.current.set(next.pageNumber, next)
      applyPage(next)
      scheduleSave(next)
    },
    [applyPage, scheduleSave],
  )

  // Apply a change, recording an undo snapshot. Used for sketch and structural
  // edits (add/remove block, draw, erase).
  const mutate = useCallback(
    (producer: (p: Page) => Page) => {
      const prev = pageRef.current
      if (!prev) return
      undoStack.current.push(prev)
      setUndoCount(undoStack.current.length)
      applySilent(producer)
    },
    [applySilent],
  )

  const handleUndo = useCallback(() => {
    const prev = undoStack.current.pop()
    setUndoCount(undoStack.current.length)
    if (!prev) return
    cache.current.set(prev.pageNumber, prev)
    applyPage(prev)
    scheduleSave(prev)
  }, [applyPage, scheduleSave])

  const setBlockText = useCallback(
    (blockId: string, text: string) => {
      applySilent((p) => ({
        ...p,
        blocks: p.blocks.map((b) => (b.id === blockId && b.kind === 'text' ? { ...b, text } : b)),
      }))
    },
    [applySilent],
  )

  const setBlockStrokes = useCallback(
    (blockId: string, strokes: Stroke[]) => {
      mutate((p) => ({
        ...p,
        blocks: p.blocks.map((b) =>
          b.id === blockId && b.kind === 'sketch' ? { ...b, strokes } : b,
        ),
      }))
    },
    [mutate],
  )

  const setBlockSize = useCallback(
    (blockId: string, width: number, height: number) => {
      applySilent((p) => ({
        ...p,
        blocks: p.blocks.map((b) =>
          b.id === blockId && b.kind === 'sketch' ? { ...b, width, height } : b,
        ),
      }))
    },
    [applySilent],
  )

  const addBlock = useCallback(
    (kind: Block['kind']) => {
      mutate((p) => {
        const block: Block =
          kind === 'text' ? emptyTextBlock() : { kind: 'sketch', id: newId(), strokes: [] }
        return { ...p, blocks: [...p.blocks, block] }
      })
    },
    [mutate],
  )

  const removeBlock = useCallback(
    (blockId: string) => {
      mutate((p) => {
        const next = p.blocks.filter((b) => b.id !== blockId)
        return { ...p, blocks: next.length ? next : [emptyTextBlock()] }
      })
    },
    [mutate],
  )

  const moveBlock = useCallback(
    (blockId: string, dir: -1 | 1) => {
      mutate((p) => {
        const i = p.blocks.findIndex((b) => b.id === blockId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= p.blocks.length) return p
        const blocks = [...p.blocks]
        ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
        return { ...p, blocks }
      })
    },
    [mutate],
  )

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
          <ChevronLeftIcon size={18} />
          Notebooks
        </button>
        <h1 className="editor-title">{meta?.title ?? 'Notebook'}</h1>
        <div className="editor-bar-right">
          <span className={`save-state ${saving ? 'is-saving' : ''}`}>
            {saving ? 'Saving…' : 'Saved'}
          </span>
          <button className="tool-btn" onClick={handleUndo} disabled={undoCount === 0} title="Undo">
            <UndoIcon />
          </button>
        </div>
      </header>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="editor-stage">
        <div className={`page-sheet sheet-${meta?.style ?? 'ruled'}`}>
          {page?.blocks.map((block, i) => (
            <div className="block-row" key={block.id}>
              <div className="block-controls">
                <button
                  className="block-ctl"
                  onClick={() => moveBlock(block.id, -1)}
                  disabled={i === 0}
                  title="Move up"
                  aria-label="Move block up"
                >
                  <ArrowUpIcon size={16} />
                </button>
                <button
                  className="block-ctl"
                  onClick={() => moveBlock(block.id, 1)}
                  disabled={i === page.blocks.length - 1}
                  title="Move down"
                  aria-label="Move block down"
                >
                  <ArrowDownIcon size={16} />
                </button>
                <button
                  className="block-ctl block-ctl-danger"
                  onClick={() => removeBlock(block.id)}
                  title="Delete block"
                  aria-label="Delete block"
                >
                  <TrashIcon size={16} />
                </button>
              </div>

              {block.kind === 'text' ? (
                <TextBlock
                  text={block.text}
                  placeholder="Write here — type, use your stylus, or dictate…"
                  onChange={(text) => setBlockText(block.id, text)}
                  onRemoveEmpty={
                    page.blocks.length > 1 ? () => removeBlock(block.id) : undefined
                  }
                />
              ) : (
                <SketchBlock
                  strokes={block.strokes}
                  width={block.width}
                  height={block.height}
                  onChange={(strokes) => setBlockStrokes(block.id, strokes)}
                  onResize={(w, h) => setBlockSize(block.id, w, h)}
                  onRemove={() => removeBlock(block.id)}
                />
              )}
            </div>
          ))}

          <div className="add-block-row">
            <button className="add-block-btn" onClick={() => addBlock('text')}>
              <TextIcon size={16} />
              Text
            </button>
            <button className="add-block-btn" onClick={() => addBlock('sketch')}>
              <SketchIcon size={16} />
              Sketch
            </button>
          </div>
        </div>
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
