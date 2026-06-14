# Notebook App

A personal collection of handwritten notebooks. Write with a stylus on a tablet
(primary target: **OnePlus Pad Pro + Stylo**), have your handwriting recognized
into real text, and keep everything neatly stored in **Google Drive**.

## Tech Stack

- **React** single-page app
- **GitHub Pages** for static hosting
- **Google Drive** as the storage backend (via Google OAuth, client-side)

## Documentation

- [Feature Document](docs/FEATURES.md) — full list of planned features and
  requirements.

## Development

```bash
npm install
cp .env.example .env      # then fill in VITE_GOOGLE_CLIENT_ID
npm run dev               # http://localhost:5173
npm run build             # typecheck + production build
npm run lint
```

You need a Google OAuth **Web** client (Google Cloud Console → enable the Drive
API → create credentials). Add `http://localhost:5173` and your
`https://<username>.github.io` Pages URL as authorized JavaScript origins, then
put the client ID in `.env` (local) and the `VITE_GOOGLE_CLIENT_ID` GitHub
Actions secret (prod).

## Status

**Core app working.** Google sign-in (session survives refresh), Drive storage,
and a home page to create / list / rename / delete notebooks. Each page is a
**block document**: text blocks you write into with whatever your device offers
(typing, the tablet's native stylus-handwriting, or speech-to-text — no
app-side recognition needed) plus optional **sketch blocks** for diagrams
(pressure-aware freehand via `perfect-freehand`, pen / eraser / colour / size).
Multi-page navigation with autosave to Drive and undo. See
[docs/FEATURES.md](docs/FEATURES.md) for the full scope and remaining polish
(per-notebook index page, richer text formatting).
</content>
