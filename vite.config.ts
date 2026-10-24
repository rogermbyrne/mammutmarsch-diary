import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// Emits sw.js with a precache list of every built file so the app works offline after the first visit.
function serviceWorker(): Plugin {
  return {
    name: 'emit-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      const statics = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.svg']
      const list = Array.from(new Set([...statics, ...files]))
      const version = Date.now().toString(36)
      const tpl = readFileSync('sw-template.js', 'utf8')
        .replace('__PRECACHE__', JSON.stringify(list))
        .replace('__VERSION__', version)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: tpl })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker()],
  build: { target: 'es2019', chunkSizeWarningLimit: 900 },
})
