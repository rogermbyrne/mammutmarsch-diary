# My Mammutmarsch Diary

A mobile-first training diary (PWA) for the Mammutmarsch Leipzig 42 km walk on Saturday 6 March 2027.
20-week plan: 57 training walks plus the event.
Week 1 is a short intro week (Sat 17 to Sun 25 October 2026) with one 10 km long walk on Saturday 24 October.
From week 2 (Monday 26 October 2026) each week has a Tue easy, Thu steady and Sat long walk.
Log the distance you actually walked on any walk (it defaults to the planned km); every total uses actual km.

Live: https://rogermbyrne.github.io/mammutmarsch-diary/

- React + TypeScript + Vite + Tailwind CSS + Lucide + Recharts
- Data is stored only in the browser (localStorage) on the device. No backend, no account, no tracking.
- Ticking a walk off plays a small confetti burst; finishing a week, a new longest walk, a distance milestone or the event itself gets a bigger celebration (src/lib/celebrate.ts, no dependencies, reduced-motion aware, short haptic where supported).
- Swim-or-walk Saturdays: from Sat 7 Nov 2026, every other Saturday (7 Nov, 21 Nov, 5 Dec, 19 Dec, 2 Jan, 16 Jan, 30 Jan, 13 Feb, 27 Feb) she can tick the long walk or "I swam instead". The long walk stays the planned default; a swim never changes the plan or any later distance, is stored as `activity: "swim"` on that entry and does not count toward walking km. Progress shows the swim count. A note appears only if her last 3 swim-or-walk Saturdays were all swims with no long walk at all in that span (src/lib/plan.ts, src/lib/entries.ts, src/lib/stats.ts).
- Export / import a JSON backup from Settings.
- Works offline after the first visit (service worker) and can be added to the iPhone home screen.

## Develop
```
npm install
npm run dev       # local dev
npm test          # plan / stats unit tests
npm run build     # production build into dist/
node scripts/e2e.mjs http://localhost:4173/ [fake-ISO-datetime]   # headless smoke test (needs Chrome)
node scripts/celebrate-e2e.mjs http://localhost:4173/              # celebration check, saves celebration-*.png
node scripts/swim-e2e.mjs http://localhost:4173/                   # swim-or-walk Saturdays, existing data kept, crowding note
```
The `docs/` folder holds the built site served by GitHub Pages (main branch, /docs). Deploy: `npm run build`, copy `dist/` into `docs/` (keep `docs/.nojekyll`), commit and push.
