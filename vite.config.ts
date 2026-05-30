import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/**
 * SPA fallback plugin: rewrite /p/... paths to / so the SPA handles them.
 * Without this, Vite's dev server returns 404 for unknown paths.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && req.url.startsWith('/p/')) {
          req.url = '/index.html';
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaFallback()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
