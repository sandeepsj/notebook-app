# Handwriting Notebook App — Feature Document

A personal collection of handwritten notebooks. Write with a stylus on a tablet
(primary target: **OnePlus Pad Pro + OnePlus Stylo**, but any handwriting-capable
tablet should work), have the strokes recognized into real text, and keep
everything neatly stored and organized in **Google Drive**.

---

## Tech Stack

- **Frontend:** React Single Page Application (SPA).
- **Hosting:** GitHub Pages (static hosting — no custom server).
- **Backend / storage:** Google Drive API, accessed directly from the browser
  via Google OAuth. Because GitHub Pages is static, all persistence happens
  client-side against the user's own Drive (e.g. a dedicated `Notebooks` folder
  or the app-data folder).
- **Auth:** Google OAuth 2.0 (sign in with Google, authorize Drive access).

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
- [ ] **Free sketch** mode — draw freely, not just write text.

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

## Open-Source Reuse (to evaluate)

Don't reinvent things that already exist — pick from mature open-source libraries:

- **Rich text editor:** TipTap, Lexical, Slate, Quill, or ProseMirror.
- **Sketch / drawing canvas:** Excalidraw, tldraw, `react-sketch-canvas`, or
  `perfect-freehand` for natural stylus strokes.
- **Handwriting recognition:** evaluate options such as MyScript iink,
  Google Handwriting Input / Input Tools, or an on-device/ML model — pick based
  on accuracy, licensing, and offline support.
- **Google Drive integration:** official `gapi` / Google Identity Services
  client libraries for OAuth + Drive REST API.

---

## Open Questions / Decisions to Make

- Storage format per notebook (single JSON file vs. folder-per-notebook with
  one file per page; how to store ink strokes + recognized text + sketches).
- Which handwriting recognition engine (accuracy vs. cost vs. offline).
- Offline support / local caching before syncing to Drive.
- Conflict handling when the same notebook is edited on multiple devices.
</content>
</invoke>
