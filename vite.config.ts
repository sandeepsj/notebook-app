import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: '/notebook-app/', // GitHub Pages — must match repo name
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(dirname, './src') } },
})
