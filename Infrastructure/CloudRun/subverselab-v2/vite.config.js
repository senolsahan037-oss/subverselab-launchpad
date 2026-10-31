import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Local preview as the owner (src/devPreview.js), dev server only. .devdata/ holds API answers copied once from the owner's
// real signed-in session; it is in .gitignore, .dockerignore and .gcloudignore and never reaches a build.
const DEVDATA = join(process.cwd(), '.devdata')
// SVL_DEV_API=http://localhost:8790 sends /api to a local api/server.js instead of the live service (the /admin catalogue
// panel needs it: writes never go to the live API from the dev server).
const LOCAL_API = (process.env.SVL_DEV_API || '').replace(/\/$/, '')
const fixtureFile = (url) => join(DEVDATA, url.replace(/^\/api\//, '').replace(/[^a-zA-Z0-9]+/g, '_') + '.json')
const devPreview = () => ({
  name: 'svl-dev-preview',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
      if (req.url.startsWith('/__svl_dev/fixture')) {          // saves one answer: POST /__svl_dev/fixture?path=/api/...
        if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return }
        const path = new URL(req.url, 'http://x').searchParams.get('path') || ''
        if (req.method !== 'POST' || !path.startsWith('/api/')) { res.writeHead(400, cors); res.end('bad'); return }
        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', () => { mkdirSync(DEVDATA, { recursive: true }); writeFileSync(fixtureFile(path), body); res.writeHead(200, cors); res.end('ok') })
        return
      }
      if (req.url.startsWith('/api/') && req.headers['x-svl-dev-preview'] === '1') {
        const f = fixtureFile(req.url)
        if (existsSync(f)) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(readFileSync(f)); return }
        // With a local API (SVL_DEV_API, preview config subverselab-site-dev-local) everything else, writes included, goes
        // there: the local API accepts the preview token for the catalogue admin routes (api/server.js SVL_DEV_ADMIN).
        if (req.method !== 'GET' && !LOCAL_API) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'local preview: not sent to the live API' })); return }
        delete req.headers['x-svl-dev-preview']
      }
      next()
    })
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devPreview()],
  server: {
    proxy: {
      '/api': {
        target: LOCAL_API || 'https://subverselab-site-v7tccgdmlq-ew.a.run.app',
        changeOrigin: !LOCAL_API,
        // The pages import the catalogue schema from ../api/catalogSchema.js (one file for the API and the panel); in the
        // dev server that module's URL starts with /api too, so it is served as a module, not forwarded.
        bypass: (req) => (req.url.startsWith('/api/catalogSchema.js') ? req.url : null),
      }
    }
  }
})
