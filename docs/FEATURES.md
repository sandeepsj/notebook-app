# Handwriting Notebook App — Feature Document

A personal collection of handwritten notebooks. Write with a stylus on a tablet
(primary target: **OnePlus Pad Pro + OnePlus Stylo**, but any handwriting-capable
tablet should work), have the strokes recognized into real text, and keep
everything neatly stored and organized in **Google Drive**.

---

## Tech Stack

Follows the **`react-spa-google-stack`** skill (from `sandeepsj/claude-skills`):
a static React SPA on GitHub Pages with Google OAuth + Google Drive as the data
store — no backend to maintain.

- **Frontend:** React + TypeScript SPA, built with **Vite**.
- **Routing:** `HashRouter` (GitHub Pages has no server-side rewrites, so hash
  routing avoids 404s on deep links / page links).
- **Hosting:** GitHub Pages (static), deployed via GitHub Actions.
- **Auth:** Google Identity Services (GIS) OAuth — token requested from a user
  click; **never** silent `prompt: ''`.
- **Storage:** Google Drive API with the `drive.file` scope — notebooks live in
  the user's own Drive, visible in their Drive UI, privacy-preserving.
- **Optional AI:** shared LLM proxy (`llm-proxy-smoky.vercel.app`) reusing the
  Google access token — candidate for handwriting → text via a vision model.

### Standard Setup (per the skill)

- **Scaffold:** `npm create vite@latest notebook-app -- --template react-ts`,
  then `npm i react-router-dom`.
- **`vite.config.ts`:** set `base: '/notebook-app/'` (must match the repo name)
  so production assets resolve correctly.
- **`index.html`:** include the GIS client —
  `<script src="https://accounts.google.com/gsi/client" async defer></script>`.
- **Session persistence (the critical pattern):**
  - `localStorage` holds user metadata (email/name/picture) — survives tab close.
  - `sessionStorage` holds the access token — clears on tab close (~1h lifetime).
  - On mount, restore synchronously via `loadSession()`; on any `401`, clear both
    stores and re-authenticate. This prevents the "logged out on refresh" bug.
- **Files to create:** `src/services/googleAuth.ts` (sign-in + session
  save/load/clear), `src/services/drive.ts` (folder helpers + multipart upload),
  `src/hooks/useAuth.ts`, `App.tsx` wrapped in `HashRouter`,
  `.github/workflows/deploy.yml`.
- **Google Cloud (one-time):** create project → enable Drive API → create OAuth
  Web Client → authorized origins `http://localhost:5173` and
  `https://<username>.github.io` → add yourself as test user → store Client ID in
  `VITE_GOOGLE_CLIENT_ID` (local `.env` + GitHub Secret).
- **Deploy:** GitHub Actions workflow (`actions/deploy-pages`) builds with
  `VITE_GOOGLE_CLIENT_ID` from secrets; one-time enable Pages with
  `build_type=workflow`.

### Suggested Drive Storage Model

- One Drive folder per notebook inside a top-level `Notebooks` app folder.
- One file per page (e.g. JSON holding ink strokes + recognized text + sketch
  layer), so pages load independently and the index can link by page number.
- Use folder `appProperties` (truncated to ~100 chars) for cheap home-page
  listing (title, page count, cover/excerpt) without downloading every page.

---

## Core Concept

- The app is a **collection of the user's notebooks**.
- The user can **create notebooks**.
- Notebooks are **stored in Google Drive**.
- Notebooks are **loaded and listed on the home page**.
- The user **writes by hand using a stylus** on a tablet.
- Handwriting is **detected and converted into actual text data** (not just
  images of ink).
- The app's main job is to **neatly store and organize** these notebooks.

---

## Features

### Notebooks
- [ ] Create a new notebook.
- [ ] Store notebooks in Google Drive.
- [ ] Home page that loads and displays all notebooks from Drive.
- [ ] Open, rename, and delete notebooks.
- [ ] Each notebook contains multiple pages.

### Handwriting & Input
- [ ] Stylus handwriting input on tablets (primary: OnePlus Pad Pro + Stylo).
- [ ] Support for any handwriting-capable tablet / stylus (pointer/pen events).
- [ ] **Handwriting recognition** — convert ink strokes into editable text data.
- [ ] Store recognized text alongside (or instead of) raw ink.

### Page Types
- [ ] **Ruled** notebooks (lined pages).
- [ ] **Unruled** (blank) notebooks.

### Free Sketch (overlay, not a page type)
- [ ] **Free sketch is available on any page** — it is *not* a separate page
      type. A user can sketch freely on both ruled and unruled pages, mixed in
      with handwriting/text.
- [ ] Sketch layer coexists with the handwriting/text layer on the same page.

### Editing & Tools
- [ ] **Basic text editor** for the recognized / typed text.
- [ ] **Quick toolbox** for fast access to common tools.
- [ ] **Pen color** change.
- [ ] Pen / tool selection (pen, eraser, etc.).
- [ ] Reuse existing open-source editor / canvas libraries rather than building
      from scratch (see "Open-Source Reuse" below).

### Navigation
- [ ] **Index page** per notebook that links to specific page numbers.
- [ ] Tap an index entry to **jump to the linked page**.
- [ ] **Page navigator** to move through pages.
- [ ] **Kindle-style reading UI** — show current page number, total pages, and
      smooth page-to-page navigation.

### UI / UX
- [ ] Clean, polished, tablet-friendly UI — take care of the look and feel.
- [ ] Touch- and stylus-optimized interactions.

---

## Existing Open-Source Projects (landscape)

Researched whether something already does "the same thing." Conclusion: there are
excellent **full handwriting apps**, but they are **native/desktop**, not a
React-on-the-web stack — so they're references, not drop-in reuse for this
project. The reusable pieces for *our* stack are **web component libraries**.

### Full handwriting note apps (reference, not directly reusable)
- **Saber** (`saber-notes/saber`) — cross-platform (Flutter) handwriting notes
  with sync. Closest in spirit; ruled/unruled templates, stylus-first. Not web/React.
- **Xournal++** — mature desktop (C++) handwriting + PDF annotation.
- **Rnote** — Rust/GTK4, stylus/pressure-focused sketching + notes.
- **OmniNotes** — Android notes with sketches and Google Drive/Dropbox sync.

> None target a static React SPA on GitHub Pages, so we reuse libraries rather
> than fork an app.

### Reusable web/React building blocks (the actual reuse plan)
- **Rich text editor:** **TipTap** (MIT, headless, React) or **BlockNote**
  (Notion-style, built on TipTap/ProseMirror) for the recognized-text editor and
  the index page.
- **Sketch / ink canvas:** **Excalidraw** or **tldraw** (full whiteboard React
  components), or **`perfect-freehand`** for natural pressure-aware stylus
  strokes if we want a lightweight custom canvas. A TipTap **Excalidraw
  extension** exists, which could embed sketches inline in a page.
- **Stylus input:** Pointer Events API (`pointerType === 'pen'`, pressure, tilt)
  — works on the OnePlus Stylo and other active styluses.
- **Handwriting → text recognition** (no strong open-source web option exists):
  - **MyScript iink** — best-in-class, commercial.
  - **LLM vision via the skill's LLM proxy** — send the page's ink/image to a
    vision model (Gemini/Claude) for transcription. Reuses the existing Google
    token; good fit for this serverless stack. *(Leading recommendation.)*
  - On-device JS models (e.g. TF.js) — possible but lower accuracy/more work.
- **Google Drive integration:** Google Identity Services + Drive REST v3 directly
  (per the skill), not a heavy SDK.

---

## Open Questions / Decisions to Make

- Storage format per notebook (single JSON file vs. folder-per-notebook with
  one file per page; how to store ink strokes + recognized text + sketches).
- Which handwriting recognition engine (accuracy vs. cost vs. offline).
- Offline support / local caching before syncing to Drive.
- Conflict handling when the same notebook is edited on multiple devices.
</content>
</invoke>
