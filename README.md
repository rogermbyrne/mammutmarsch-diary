# My Mammutmarsch Diary

A mobile-first training diary (PWA) for the Mammutmarsch Leipzig 42 km walk on Saturday 6 March 2027.
20-week plan built around Andrea's handwritten plan (gentle on a knee and a hip): 55 training sessions (48 walks and 7 swim Saturdays) plus the event.
Week 1 is a short intro week (Sat 17 to Sun 25 October 2026) with one 10 km long walk on Saturday 24 October.
From week 2 (Monday 26 October 2026) each week has a Tue easy and a Thu steady walk (never planned longer than 5 km), plus:
- Saturday long walks every other week: 31 Oct 12 km (week 2), then 7 Nov 15, 21 Nov 18, 5 Dec 21, 19 Dec 24, 2 Jan 27, 16 Jan 30, 30 Jan 33 and 13 Feb 13 km (weeks 3 to 17, odd weeks).
- Swim Saturdays in the weeks between (weeks 4 to 16, even weeks: 14 Nov, 28 Nov, 12 Dec, 26 Dec, 9 Jan, 23 Jan, 6 Feb). No long walk is planned; swimming is the default.
- Weeks 17 to 19 are taper weeks. Weeks 18 and 19 (Sat 20 Feb, Sat 27 Feb) have no Saturday session, just rest.
- Week 20: two 3 km walks, then the Mammutmarsch (42 km) on Sat 6 March 2027.
Log the distance you actually walked on any walk (it defaults to the planned km); every total uses actual km.

Live: https://rogermbyrne.github.io/mammutmarsch-diary/

- React + TypeScript + Vite + Tailwind CSS + Lucide + Recharts
- Data is stored only in the browser (localStorage) on the device. No backend, no account, no tracking.
- Ticking a walk off plays a small confetti burst; finishing a week, a new longest walk, a distance milestone or the event itself gets a bigger celebration (src/lib/celebrate.ts, no dependencies, reduced-motion aware, short haptic where supported).
- Swim Saturdays: she can tick "I swam" (stored as `activity: "swim"`, never counted as walking km) or log a walk with whatever km she actually did (`activity: "walk"`). Either way the day counts as done. Planned weekly and monthly km leave these Saturdays out. Progress shows the swim count (src/lib/plan.ts, src/lib/entries.ts, src/lib/stats.ts).
- Short walks are never failures: a walk under plan shows a neutral "X km less than planned", and unticked walks read "Not ticked off yet ... Missed one? No problem, just carry on."
- Existing data from the first plan (data version 1, unchanged) loads as she logged it (src/lib/storage.ts): a swim saved on an old swim-or-walk Saturday (w3-sat, w5-sat, ...) stays a swim; an old Saturday walk ticked without a typed distance keeps the old planned km it counted; entries on Saturdays the plan no longer has (w18-sat, w19-sat) move to `archived` and are kept in exports.
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
node scripts/swim-e2e.mjs http://localhost:4173/                   # her plan: long walks, swim Saturdays, taper weeks, existing data kept
```
The `docs/` folder holds the built site served by GitHub Pages (main branch, /docs). Deploy: `npm run build`, copy `dist/` into `docs/` (keep `docs/.nojekyll`), commit and push.
