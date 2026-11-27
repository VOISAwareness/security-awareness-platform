import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Training.css also holds rules for the whole app (the Outfit font for
// .font-voda, the corner-roundness setting and .rounded-*) and an @import of
// Google Fonts. It is loaded here, with the app, as it always was: left to
// the Training page's own code it would apply only after someone opened the
// LMS, and a blocked font host would stop that page from loading at all.
import './Pages/Training/Training.css'
import App from './App.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './services/queryCache.js'

// A page's code is fetched when it is first opened. After a new deploy the
// old file names are gone, so that fetch fails: reload once to pick up the new
// version instead of leaving a blank screen (not again within 10 s, so a real
// outage cannot loop; the error screen then shows).
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'vshield-chunk-reload-at'
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 10_000) return
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    // no sessionStorage: reload once anyway
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
