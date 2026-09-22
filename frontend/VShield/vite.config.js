import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from "url";

// The HTTP API's CORS config only allows the localhost dev origins, so a browser
// on a Codespace/tunnel hostname gets blocked. Proxying keeps API calls
// same-origin — the dev server makes the real call, where CORS does not apply.
const API_TARGET =
  process.env.VITE_API_PROXY_TARGET ||
  'https://1ldu4adn0l.execute-api.ap-south-1.amazonaws.com'

export default defineConfig({
  plugins: [react()],
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
