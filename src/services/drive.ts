// Google Drive as the data store.
//
// Layout:
//   Notebooks/                     <- top-level app folder
//     <notebook folder>/           <- one folder per notebook
//       page-0001.json             <- one JSON file per page
//       page-0002.json
//
// The notebook folder carries `appProperties` (title, style, pageCount,
// createdAt, updatedAt) so the home page can list notebooks without
// downloading any pages.

import type { NotebookMeta, Page, PageStyle, Stroke } from '@/types'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const APP_FOLDER = 'Notebooks'

/** Thrown when Drive returns 401 — the caller should force re-auth. */
export class UnauthorizedError extends Error {
  constructor() {
    super('Google access token expired or invalid (401).')
    this.name = 'UnauthorizedError'
  }
}

/** appProperties values are capped at 124 bytes; keep well under defensively. */
function clip(value: string, max = 100): string {
  return value.length > max ? value.slice(0, max) : value
}

// ---- Low-level fetch wrappers ---------------------------------------------

async function driveFetch(token: string, url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  })
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Drive ${res.status}: ${detail.slice(0, 200)}`)
  }
  return res
}

async function driveJson<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await driveFetch(token, url, init)
  return res.json() as Promise<T>
}

/** Multipart upload of a JSON document (create when no id, update when given). */
async function uploadJson(
  token: string,
  data: unknown,
  opts: { name: string; parents?: string[]; appProperties?: Record<string, string>; fileId?: string },
): Promise<{ id: string }> {
  const metadata: Record<string, unknown> = { name: opts.name, mimeType: 'application/json' }
  if (opts.parents) metadata.parents = opts.parents
  if (opts.appProperties) metadata.appProperties = opts.appProperties

  const boundary = '---notebook-boundary'
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(data)}\r\n` +
    `--${boundary}--`

  const url = opts.fileId
    ? `${UPLOAD_API}/files/${opts.fileId}?uploadType=multipart&fields=id`
    : `${UPLOAD_API}/files?uploadType=multipart&fields=id`

  return driveJson<{ id: string }>(token, url, {
    method: opts.fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
}

// ---- App folder ------------------------------------------------------------

let appFolderCache: string | null = null

export async function getAppFolderId(token: string): Promise<string> {
  if (appFolderCache) return appFolderCache
  const q = `name='${APP_FOLDER}' and mimeType='${FOLDER_MIME}' and trashed=false`
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`
  const found = await driveJson<{ files: { id: string }[] }>(token, url)
  if (found.files.length > 0) {
    appFolderCache = found.files[0].id
    return appFolderCache
  }
  const created = await driveJson<{ id: string }>(token, `${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: APP_FOLDER, mimeType: FOLDER_MIME }),
  })
  appFolderCache = created.id
  return created.id
}

// ---- Notebooks -------------------------------------------------------------

interface DriveFolder {
  id: string
  name: string
  modifiedTime: string
  appProperties?: Record<string, string>
}

function toMeta(f: DriveFolder): NotebookMeta {
  const p = f.appProperties ?? {}
  return {
    id: f.id,
    title: p.title || f.name,
    style: (p.style as PageStyle) || 'ruled',
    pageCount: Number(p.pageCount ?? '0') || 0,
    createdAt: p.createdAt || f.modifiedTime,
    updatedAt: p.updatedAt || f.modifiedTime,
  }
}

export async function getNotebook(token: string, id: string): Promise<NotebookMeta> {
  const fields = 'id,name,modifiedTime,appProperties'
  const url = `${DRIVE_API}/files/${id}?fields=${encodeURIComponent(fields)}`
  const folder = await driveJson<DriveFolder>(token, url)
  return toMeta(folder)
}

export async function listNotebooks(token: string): Promise<NotebookMeta[]> {
  const appFolder = await getAppFolderId(token)
  const q = `'${appFolder}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`
  const fields = 'files(id,name,modifiedTime,appProperties)'
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime desc&spaces=drive`
  const { files } = await driveJson<{ files: DriveFolder[] }>(token, url)
  return files.map(toMeta)
}

export async function createNotebook(
  token: string,
  title: string,
  style: PageStyle,
): Promise<NotebookMeta> {
  const appFolder = await getAppFolderId(token)
  const now = new Date().toISOString()
  const appProperties = {
    title: clip(title),
    style,
    pageCount: '0',
    createdAt: now,
    updatedAt: now,
  }
  const created = await driveJson<{ id: string }>(token, `${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: clip(title) || 'Untitled',
      mimeType: FOLDER_MIME,
      parents: [appFolder],
      appProperties,
    }),
  })
  return { id: created.id, title, style, pageCount: 0, createdAt: now, updatedAt: now }
}

/** Patch a notebook folder's name and/or appProperties. */
export async function updateNotebook(
  token: string,
  id: string,
  patch: Partial<Pick<NotebookMeta, 'title' | 'style' | 'pageCount'>>,
): Promise<void> {
  const appProperties: Record<string, string> = { updatedAt: new Date().toISOString() }
  if (patch.title !== undefined) appProperties.title = clip(patch.title)
  if (patch.style !== undefined) appProperties.style = patch.style
  if (patch.pageCount !== undefined) appProperties.pageCount = String(patch.pageCount)

  const body: Record<string, unknown> = { appProperties }
  if (patch.title !== undefined) body.name = clip(patch.title) || 'Untitled'

  await driveFetch(token, `${DRIVE_API}/files/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function deleteNotebook(token: string, id: string): Promise<void> {
  await driveFetch(token, `${DRIVE_API}/files/${id}`, { method: 'DELETE' })
}

// ---- Pages -----------------------------------------------------------------

interface PageDoc {
  pageNumber: number
  ink: Stroke[]
  sketch: Stroke[]
  text: string
  updatedAt: string
}

function pageFileName(pageNumber: number): string {
  return `page-${String(pageNumber).padStart(4, '0')}.json`
}

interface DriveFile {
  id: string
  name: string
}

/** List page files in a notebook folder, ordered by page number. */
export async function listPageFiles(
  token: string,
  notebookId: string,
): Promise<{ id: string; pageNumber: number }[]> {
  const q = `'${notebookId}' in parents and trashed=false and mimeType='application/json'`
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&orderBy=name&spaces=drive`
  const { files } = await driveJson<{ files: DriveFile[] }>(token, url)
  return files
    .map((f) => ({ id: f.id, pageNumber: Number(f.name.replace(/\D/g, '')) || 0 }))
    .sort((a, b) => a.pageNumber - b.pageNumber)
}

export async function readPage(token: string, fileId: string): Promise<Page> {
  const res = await driveFetch(token, `${DRIVE_API}/files/${fileId}?alt=media`)
  const doc = (await res.json()) as PageDoc
  return {
    id: fileId,
    pageNumber: doc.pageNumber,
    ink: doc.ink ?? [],
    sketch: doc.sketch ?? [],
    text: doc.text ?? '',
    updatedAt: doc.updatedAt,
  }
}

/** Create or update a page file. Returns the (possibly newly assigned) id. */
export async function savePage(
  token: string,
  notebookId: string,
  page: Page,
): Promise<string> {
  const doc: PageDoc = {
    pageNumber: page.pageNumber,
    ink: page.ink,
    sketch: page.sketch,
    text: page.text,
    updatedAt: new Date().toISOString(),
  }
  const { id } = await uploadJson(token, doc, {
    name: pageFileName(page.pageNumber),
    parents: page.id ? undefined : [notebookId],
    fileId: page.id || undefined,
  })
  return id
}

export async function deletePage(token: string, fileId: string): Promise<void> {
  await driveFetch(token, `${DRIVE_API}/files/${fileId}`, { method: 'DELETE' })
}
