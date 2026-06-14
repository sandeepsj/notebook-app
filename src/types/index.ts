// Domain model for the handwriting notebook app.

export interface GoogleUser {
  email: string
  name: string
  picture: string
}

export interface AuthState {
  isLoggedIn: boolean
  user: GoogleUser
  accessToken: string
}

/** Page background style (cosmetic — shown on the home cards). */
export type PageStyle = 'ruled' | 'blank'

/**
 * A single freehand stroke captured from pointer events.
 * `points` is a flat list of [x, y, pressure] tuples in sketch-block units.
 */
export interface Stroke {
  points: [number, number, number][]
  color: string
  size: number
  tool: 'pen' | 'highlighter'
}

/**
 * A page is an ordered list of blocks. Text blocks hold writing (typed, or
 * entered via the device's native stylus-handwriting / speech input); sketch
 * blocks hold freehand drawings for diagrams. Sketches are never converted to
 * text — the device handles handwriting→text into text blocks itself.
 */
export type Block =
  | { kind: 'text'; id: string; text: string }
  | { kind: 'sketch'; id: string; strokes: Stroke[] }

/** One page of a notebook. Persisted as a single JSON file in Drive. */
export interface Page {
  /** Drive file id; empty until the page has been saved at least once. */
  id: string
  pageNumber: number
  blocks: Block[]
  updatedAt: string
}

/**
 * Lightweight notebook summary, built from the Drive folder + its
 * appProperties so the home page can list without downloading pages.
 */
export interface NotebookMeta {
  /** Drive folder id. */
  id: string
  title: string
  style: PageStyle
  pageCount: number
  createdAt: string
  updatedAt: string
  /** Drive file id of the uploaded cover image, if any. */
  coverId?: string
}
