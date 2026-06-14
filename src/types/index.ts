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

/** Page background style. "Free sketch" is an overlay, not a style. */
export type PageStyle = 'ruled' | 'blank'

/**
 * A single freehand stroke captured from pointer events.
 * `points` is a flat list of [x, y, pressure] tuples in page coordinates.
 */
export interface Stroke {
  points: [number, number, number][]
  color: string
  size: number
  tool: 'pen' | 'highlighter' | 'sketch'
}

/** One page of a notebook. Persisted as a single JSON file in Drive. */
export interface Page {
  /** Drive file id; empty until the page has been saved at least once. */
  id: string
  pageNumber: number
  /** Handwriting layer — recognized into `text`. */
  ink: Stroke[]
  /** Free-sketch overlay, coexists with the ink/text layer. */
  sketch: Stroke[]
  /** Recognized or typed text for this page. */
  text: string
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
}
