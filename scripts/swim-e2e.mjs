// Headless check of Andrea's plan: long walks every other Saturday, swim Saturdays between, taper weeks, existing data kept.
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
const clickText = async (p, t) => { const ok = await p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t)); if (b) b.click(); return !!b }, t); if (!ok) fail('no button ' + t); await sleep(300) }
const overflow = async (p, label) => { const o = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); if (o[0] > o[1]) fail('overflow on ' + label) }
const noDash = async (p, label) => { if (/\u2014/.test(await text(p))) fail('em dash on ' + label) }

// 1) Sat 7 Nov with her existing data plus an old swim on w3-sat: kept as logged, 15 km long walk, no swim button.
const withSwim = { ...OLD, entries: { ...OLD.entries, 'w3-sat': { completed: true, activity: 'swim' } } }
let p = await open('2026-11-07T09:00:00+01:00', withSwim)
let t = await text(p)
if (!t.includes('Hi Andrea!')) fail('existing name lost')
if (!/5\s*\/55/.test(t)) fail('existing 5 sessions (4 walks + old swim) not shown')
if (!t.includes('Swim ticked off')) fail('old w3-sat swim not shown as a swim')
let s = await stored(p)
for (const id of Object.keys(withSwim.entries)) if (norm(s?.entries?.[id] ?? withSwim.entries[id]) !== norm(withSwim.entries[id])) fail('existing entry changed: ' + id)
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/plan2-2026-11-07-today-oldswim.png', fullPage: true })
await p.close()

// 1b) Sat 7 Nov without an old swim: 15 km long walk, Mark Complete, no swim option.
p = await open('2026-11-07T09:00:00+01:00', OLD)
t = await text(p)
if (!t.includes('Long endurance walk')) fail('long walk missing on 7 Nov')
if (!/\b15\s*km/.test(t)) fail('15 km not shown on 7 Nov')
if (await p.$('[data-testid="i-swam"]')) fail('swim option on a long-walk Saturday')
await overflow(p, '7 Nov today'); await noDash(p, '7 Nov today')
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/plan2-2026-11-07-today.png', fullPage: true })
await clickText(p, 'Mark Complete')
s = await stored(p)
if (s.entries['w3-sat']?.actualKm !== 15) fail('w3-sat tick should log 15 km')
await p.close()

// 2) Sat 14 Nov: swim day. "I swam" logs a swim, no km.
p = await open('2026-11-14T09:00:00+01:00', OLD)
t = await text(p)
if (!t.includes('Swim day')) fail('swim day title missing on 14 Nov')
if (!(await p.$('[data-testid="i-swam"]'))) fail('no I swam button on 14 Nov')
await overflow(p, '14 Nov today'); await noDash(p, '14 Nov today')
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/plan2-2026-11-14-today.png', fullPage: true })
await p.click('[data-testid="i-swam"]'); await sleep(400)
s = await stored(p)
if (s.entries['w4-sat']?.activity !== 'swim' || s.entries['w4-sat'].actualKm !== undefined) fail('I swam not stored as a swim')
if (!(await text(p)).includes('Swim ticked off')) fail('swim confirmation missing')
await nav(p, 'Progress')
const count = await p.$eval('[data-testid="swim-count"]', (e) => e.textContent).catch(() => null)
if (count !== '1') fail('swim count should be 1, got ' + count)
await noDash(p, 'progress')
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/plan2-progress.png', fullPage: true })
await p.close()

// 3) Sat 14 Nov: "I walked instead" opens the sheet on Walk with an empty km field; 8 km logs a walk.
p = await open('2026-11-14T09:00:00+01:00', OLD)
await p.click('[data-testid="walk-instead"]'); await sleep(400)
if (!(await p.$('#km'))) fail('km field missing for a walk on a swim day')
if ((await p.$eval('#km', (e) => e.value)) !== '') fail('km field should start empty on a swim day')
await noDash(p, 'swim-day sheet')
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/plan2-swimday-walk-sheet.png' })
await clickText(p, 'Mark Complete')
if (!(await text(p)).includes('Please enter how far you walked')) fail('empty km on swim-day walk should ask for a distance')
await p.type('#km', '8')
await clickText(p, 'Mark Complete')
s = await stored(p)
if (s.entries['w4-sat']?.activity !== 'walk' || s.entries['w4-sat'].actualKm !== 8 || !s.entries['w4-sat'].completed) fail('swim-day walk not stored: ' + JSON.stringify(s.entries['w4-sat']))
await p.close()

// 4) Short walk is not a failure: w5-sat 18 km logged as 12 shows "6 km less than planned".
p = await open('2026-11-21T09:00:00+01:00', OLD)
await p.evaluate(() => document.querySelector('button.block.w-full')?.click()); await sleep(400)
if (!(await p.$('#km'))) fail('sheet did not open for 21 Nov')
await p.$eval('#km', (e) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(e, '12'); e.dispatchEvent(new Event('input', { bubbles: true })) }); await sleep(200)
if (!(await text(p)).includes('6 km less than planned.')) fail('neutral short-walk wording missing')
await p.close()

// 5) Diary: week 4 shows the swim week note; week 18 taper with no Saturday; no em dashes.
p = await open('2026-11-14T09:00:00+01:00', OLD)
await nav(p, 'Diary')
t = await text(p)
if (!t.includes('Swim week')) fail('swim week note missing in week 4')
if (!t.includes('maybe swimming')) fail('swim day chip missing in week 4')
await overflow(p, 'diary'); await noDash(p, 'diary')
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/plan2-diary-w4.png', fullPage: true })
await p.select('select', '18'); await sleep(200)
t = await text(p)
if (!t.includes('Taper week: no long walk on Saturday')) fail('taper note missing in week 18')
if (/Long endurance walk/.test(t)) fail('week 18 should have no long walk')
await p.screenshot({ path: '/workspace/mammutmarsch-diary/shots/plan2-diary-w18.png', fullPage: true })
await p.select('select', '15'); await sleep(200)
if (!(await text(p)).includes('33')) fail('week 15 should show 33 km')
await p.close()

// 6) Old entries on retired Saturdays are archived, not lost, after the app saves.
const retired = { ...OLD, entries: { ...OLD.entries, 'w19-sat': { completed: true, activity: 'swim' } } }
p = await open('2026-11-14T09:00:00+01:00', retired)
await p.click('[data-testid="i-swam"]'); await sleep(400)
s = await stored(p)
if (!s.archived?.['w19-sat']?.completed) fail('w19-sat entry not archived after save')
await p.close()

await browser.close()
console.log(process.exitCode ? 'PLAN E2E FAILED' : 'PLAN E2E PASSED')
