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

**Foundation built.** Working: Google sign-in (session survives refresh), Drive
storage layer, and a home page to create / list / rename / delete notebooks. The
page editor — stylus canvas, free-sketch overlay, handwriting recognition, and
the page navigator — is next. See [docs/FEATURES.md](docs/FEATURES.md) for the
full scope.
</content>
