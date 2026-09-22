import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from "url";

// The HTTP API's CORS config only allows the localhost dev origins, so a browser
// on a Codespace/tunnel hostname gets blocked. Proxying keeps API calls
// same-origin — the dev server makes the real call, where CORS does not apply.
const API_TARGET =
  process.env.VITE_API_PROXY_TARGET ||
  'https://1ldu4adn0l.execute-api.ap-south-1.amazonaws.com'

// Recipient uploads PUT straight to a presigned S3 URL, which skips the proxy
// above and hits the bucket's own CORS allowlist — same localhost-only list.
// Forward those server-side too. The target comes from the presigned URL rather
// than config, so the bucket and region stay out of this file and the Host the
// signature was computed over is always the one we connect to.
const s3UploadProxy = () => ({
  name: 'vshield-s3-upload-proxy',
  configureServer(server) {
    server.middlewares.use('/__s3-upload', (req, res) => {
      const target = new URL(req.url, 'http://localhost').searchParams.get('url')
      let upstream
      try {
        upstream = new URL(target)
      } catch {
        res.statusCode = 400
        return res.end('missing or malformed url')
      }
      // Never let the dev server act as an open relay.
      if (upstream.protocol !== 'https:' || !upstream.hostname.endsWith('.amazonaws.com')) {
        res.statusCode = 403
        return res.end('target not allowed')
      }

      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', async () => {
        try {
          const put = await fetch(upstream, {
            method: 'PUT',
            headers: { 'content-type': req.headers['content-type'] || 'text/csv' },
            body: Buffer.concat(chunks),
          })
          res.statusCode = put.status
          res.end(await put.text())
        } catch (e) {
          res.statusCode = 502
          res.end(String(e?.message || e))
        }
      })
    })
  },
})

export default defineConfig({
  plugins: [react(), s3UploadProxy()],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ]
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    allowedHosts: true, // Allow Cloudflare tunnel hostnames
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  }
})
