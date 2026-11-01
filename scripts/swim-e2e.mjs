// Headless check of the swim-or-walk Saturdays: anchor date, swim choice, existing data kept, swim count, crowding note.
// Usage: node scripts/swim-e2e.mjs http://localhost:4173/
import puppeteer from 'puppeteer-core'
const BASE = process.argv[2] || 'http://localhost:4173/'
const KEY = 'mammutmarsch-diary-v1'
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1 }
const norm = (o) => JSON.stringify(Object.keys(o || {}).sort().reduce((a, k) => (o[k] === undefined ? a : { ...a, [k]: o[k] }), {}))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const OLD = { version: 1, displayName: 'Andrea', entries: { 'w1-sat': { completed: true, actualKm: 10, completedAt: '2026-10-24T15:00:00.000Z' }, 'w2-tue': { completed: true, actualKm: 4.5 }, 'w2-thu': { completed: true, actualKm: 5, notes: 'Rainy but fine' }, 'w2-sat': { completed: true, actualKm: 12.5, durationMin: 150 } }, weekNotes: { '1': 'Lovely first walk' }, seenMilestones: ['first'] }

async function open(fakeIso, seed) {
  const page = await browser.newPage()
  page.on('pageerror', (e) => fail('pageerror ' + e.message))
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.evaluateOnNewDocument((iso) => {
    const fixed = new Date(iso).getTime(); const RD = Date
    class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(fixed) } static now() { return fixed } }
    Date = FD // eslint-disable-line no-global-assign
  }, fakeIso)
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await page.evaluate((k, v) => { localStorage.clear(); if (v) localStorage.setItem(k, v) }, KEY, seed ? JSON.stringify(seed) : null)
  await page.reload({ waitUntil: 'networkidle0' })
  return page
}
const text = (p) => p.evaluate(() => document.body.innerText)
const stored = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY)
const nav = async (p, t) => { await p.evaluate((t) => [...document.querySelectorAll('nav button')].find((b) => b.textContent.includes(t)).click(), t); await sleep(250) }

// 1) Sat 31 Oct (before the anchor): walk-only, no swim option.
let p = await open('2026-10-31T09:00:00+01:00', null)
if (await p.$('[data-testid="swim-instead"]')) fail('swim option shown on Sat 31 Oct (before 7 Nov anchor)')
await p.close()

// 2) Sat 7 Nov with her existing data: data intact, swim option offered, ticking a swim logs it without touching km.
p = await open('2026-11-07T09:00:00+01:00', OLD)
let t = await text(p)
if (!t.includes('Hi Andrea!')) fail('existing name lost')
if (!/4\s*\/57/.test(t)) fail('existing 4 walks not shown')
if (!t.includes('Long endurance walk')) fail('long walk should stay the default plan item')
if (!(await p.$('[data-testid="swim-instead"]'))) fail('no swim option on Sat 7 Nov')
const kmBefore = (t.match(/([\d.]+)km\s*walked/i) || t.match(/([\d.]+)\s*km\s*\n?\s*walked/i) || [])[1]
await p.click('[data-testid="swim-instead"]'); await sleep(400)
t = await text(p)
if (!t.includes('Swim ticked off')) fail('swim confirmation missing')
let s = await stored(p)
if (s.entries['w3-sat']?.activity !== 'swim' || !s.entries['w3-sat'].completed) fail('swim not stored')
if (s.entries['w3-sat'].actualKm !== undefined) fail('swim should not log walking km')
for (const id of Object.keys(OLD.entries)) if (norm(s.entries[id]) !== norm(OLD.entries[id])) fail('existing entry changed: ' + id)
if (s.weekNotes['1'] !== 'Lovely first walk') fail('week note lost')
if (Object.keys(s.entries).some((id) => !(id in OLD.entries) && id !== 'w3-sat')) fail('other entries were created: plan changed')
const kmAfter = (t.match(/([\d.]+)km\s*walked/i) || t.match(/([\d.]+)\s*km\s*\n?\s*walked/i) || [])[1]
if (kmBefore !== kmAfter) fail(`walked km changed by a swim: ${kmBefore} -> ${kmAfter}`)
await p.reload({ waitUntil: 'networkidle0' })
s = await stored(p)
if (s.entries['w3-sat']?.activity !== 'swim') fail('swim not persisted after reload')
await nav(p, 'Progress')
const count = await p.$eval('[data-testid="swim-count"]', (e) => e.textContent).catch(() => null)
if (count !== '1') fail('swim count should be 1, got ' + count)
if (await p.$('[data-testid="swim-crowding-note"]')) fail('crowding note shown after 1 swim')
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/swim-progress.png', fullPage: true })
// Diary: week 3 Saturday shows as Swim; week 4 Saturday has no swim chip; week 5 does.
await nav(p, 'Diary')
t = await text(p)
if (!/Swim/.test(t) || !(await p.$('[data-swim="true"]'))) fail('swim not marked in diary')
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/swim-diary-w3.png', fullPage: true })
await p.click('button[aria-label="Next week"]'); await sleep(200)
if ((await text(p)).includes('or swim')) fail('week 4 (14 Nov) should be walk-only')
await p.click('button[aria-label="Next week"]'); await sleep(200)
if (!(await text(p)).includes('or swim')) fail('week 5 (21 Nov) should offer the swim')
// Sheet choice on week 5: pick swim then Mark Complete
await p.evaluate(() => [...document.querySelectorAll('[role=button][aria-label*="open details"]')].find((e) => e.getAttribute('aria-label').startsWith('Long')).click())
await sleep(300)
await p.click('[data-activity="swim"]'); await sleep(150)
if (await p.$('#km')) fail('distance field should hide for a swim')
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/swim-sheet.png' })
await p.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Mark Complete')).click()); await sleep(300)
s = await stored(p)
if (s.entries['w5-sat']?.activity !== 'swim') fail('sheet swim choice not stored')
// switch back to the long walk from the sheet
await p.click('[data-activity="walk"]'); await sleep(150)
s = await stored(p)
if (s.entries['w5-sat']?.activity !== undefined || s.entries['w5-sat'].actualKm !== 10) fail('switching back to the walk failed')
await p.close()

// 2b) Sat 27 Feb 2027 (final long walk): walk-only, no swim option; Sat 13 Feb is the last swim Saturday.
p = await open('2027-02-27T09:00:00+01:00', OLD)
if (await p.$('[data-testid="swim-instead"]')) fail('swim option shown on Sat 27 Feb (final long walk)')
if (!(await text(p)).includes('Long endurance walk')) fail('Sat 27 Feb should show the long walk')
await nav(p, 'Diary')
if ((await text(p)).includes('or swim')) fail('week 19 (27 Feb) should be walk-only in the diary')
await p.click('button[aria-label="Previous week"]'); await sleep(200)
await p.click('button[aria-label="Previous week"]'); await sleep(200)
if (!(await text(p)).includes('or swim')) fail('week 17 (13 Feb) should offer the swim')
await p.close()
p = await open('2027-02-13T09:00:00+01:00', OLD)
if (!(await p.$('[data-testid="swim-instead"]'))) fail('no swim option on Sat 13 Feb')
await p.close()

// 3) Crowding: 3 eligible swims in a row and no long walk in between shows the note; alternating does not.
const crowd = { ...OLD, entries: { ...OLD.entries, 'w3-sat': { completed: true, activity: 'swim' }, 'w5-sat': { completed: true, activity: 'swim' }, 'w7-sat': { completed: true, activity: 'swim' } } }
p = await open('2026-12-06T09:00:00+01:00', crowd)
if (!(await p.$('[data-testid="swim-crowding-note"]'))) fail('crowding note missing on Today')
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/swim-crowding-today.png', fullPage: true })
await p.close()
const alt = { ...crowd, entries: { ...crowd.entries, 'w4-sat': { completed: true, actualKm: 15 }, 'w6-sat': { completed: true, actualKm: 16 } } }
p = await open('2026-12-06T09:00:00+01:00', alt)
if (await p.$('[data-testid="swim-crowding-note"]')) fail('crowding note shown although long walks were done in between')
await p.close()

await browser.close()
console.log(process.exitCode ? 'SWIM E2E FAILED' : 'SWIM E2E PASSED')
