# My Mammutmarsch Diary

A mobile-first training diary (PWA) for the Mammutmarsch Leipzig 42 km walk on Saturday 6 March 2027.
19-week plan from Monday 26 October 2026: 56 training walks (Tue easy, Thu steady, Sat long) plus the event.

Live: https://rogermbyrne.github.io/mammutmarsch-diary/

- React + TypeScript + Vite + Tailwind CSS + Lucide + Recharts
- Data is stored only in the browser (localStorage) on the device. No backend, no account, no tracking.
- Export / import a JSON backup from Settings.
- Works offline after the first visit (service worker) and can be added to the iPhone home screen.

## Develop
```
npm install
npm run dev       # local dev
npm test          # plan / stats unit tests
npm run build     # production build into dist/
node scripts/e2e.mjs http://localhost:4173/ [fake-ISO-datetime]   # headless smoke test (needs Chrome)
```
The `docs/` folder holds the built site served by GitHub Pages (main branch, /docs).
