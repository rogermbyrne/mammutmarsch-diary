// Headless smoke test: iPhone viewport, overflow check, complete/uncomplete, persistence, tabs, offline.
import puppeteer from 'puppeteer-core'
const BASE = process.argv[2] || 'http://localhost:4173/'
const FAKE = process.argv[3] // optional ISO datetime to fake "now"
const shots = process.env.SHOTS || '/workspace/mammutmarsch-diary/shots'
import { mkdirSync } from 'node:fs'
mkdirSync(shots, { recursive: true })
const tag = FAKE ? FAKE.slice(0, 10) : 'now'
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1 }
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const page = await browser.newPage()
page.on('pageerror', (e) => fail('pageerror ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()) })
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
if (FAKE) {
  await page.evaluateOnNewDocument((iso) => {
    const fixed = new Date(iso).getTime(); const RD = Date
    class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(fixed) } static now() { return fixed } }
    // eslint-disable-next-line no-global-assign
    Date = FD
  }, FAKE)
}
const text = () => page.evaluate(() => document.body.innerText)
const overflow = async (label) => {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  if (o.sw > o.cw) fail(`horizontal overflow on ${label}: ${o.sw} > ${o.cw}`)
}
const clickText = async (sel, t) => {
  const ok = await page.evaluate((sel, t) => { const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(t)); if (el) { el.click(); return true } return false }, sel, t)
  if (!ok) fail(`could not click ${sel} "${t}"`)
  await new Promise((r) => setTimeout(r, 250))
}
await page.goto(BASE, { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' })
let t = await text()
if (!t.includes('My Mammutmarsch Diary')) fail('title missing')
if (!t.includes('42 km · Leipzig · 6 March 2027')) fail('subtitle missing')
// First load: nothing is pre-ticked.
if (!/0\s*\/57/.test(t)) fail('0/57 missing on first load')
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mammutmarsch-diary-v1') || 'null'))
if (saved && Object.values(saved.entries).some((e) => e.completed)) fail('something was pre-ticked on first load')
await overflow('today'); await page.screenshot({ path: `${shots}/${tag}-today.png`, fullPage: true })
// complete next walk
await clickText('button', 'Mark Complete')
t = await text()
if (!t.includes('Well done')) fail('confirmation not shown')
const isEventDay = FAKE && FAKE.startsWith('2027-03-06')
// on event day the event is ticked: walked = 42 km
if (isEventDay ? !t.includes('42km') && !t.includes('42\nkm') : !/1\s*\/57/.test(t)) fail('dashboard not updated')
await page.screenshot({ path: `${shots}/${tag}-today-done.png`, fullPage: true })
// persistence
await page.reload({ waitUntil: 'networkidle0' })
t = await text()
const persisted = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('mammutmarsch-diary-v1')).entries).filter((e) => e.completed).length)
if (persisted !== 1) fail('not persisted after reload')
// undo: reset storage for the diary part
await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' })
if (!/0\s*\/57/.test(await text())) fail('reset did not return to 0/57')
// diary
await clickText('nav button', 'Diary')
await overflow('diary'); await page.screenshot({ path: `${shots}/${tag}-diary.png`, fullPage: true })
const checks = await page.$$('[role=checkbox]')
const inWeek1 = FAKE && FAKE < '2026-10-26'
if (checks.length !== (inWeek1 ? 1 : 3)) fail('unexpected walk checkbox count in current week: ' + checks.length)
await checks[0].click(); await new Promise((r) => setTimeout(r, 200))
const ac = await page.evaluate(() => document.querySelector('[role=checkbox]').getAttribute('aria-checked'))
if (ac !== 'true') fail('diary checkbox did not toggle')
// open sheet and set actual distance
await page.evaluate(() => document.querySelectorAll('[role=button][aria-label*="open details"]')[0].click())
await new Promise((r) => setTimeout(r, 300))
await overflow('sheet'); await page.screenshot({ path: `${shots}/${tag}-sheet.png` })
await page.$eval('#km', (el) => { el.value = '' })
await page.click('#km', { clickCount: 3 }); await page.type('#km', '7.5')
await clickText('button', 'Save details')
await page.keyboard.press('Escape'); await new Promise((r) => setTimeout(r, 200))
await clickText('nav button', 'Progress')
t = await text()
// training distance = the 7.5 km actual just logged (not the planned km)
if (!/Training distance/.test(t) || !t.includes('7.5 km')) fail('actual distance not reflected in progress totals')
await overflow('progress'); await page.screenshot({ path: `${shots}/${tag}-progress.png`, fullPage: true })
// week 1: intro week Sat 17 to Sun 25 Oct with one 10 km walk on Sat 24 Oct; ticking it adds 10 km
await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' })
await clickText('nav button', 'Diary')
for (let i = 0; i < 20; i++) { const b = await page.$('button[aria-label="Previous week"]:not([disabled])'); if (!b) break; await b.click() }
t = await text()
if (!t.includes('Week 1 of 20')) fail('week 1 missing')
if (!/17\s*.\s*25 Oct 2026/.test(t)) fail('week 1 range 17 to 25 Oct missing')
if (!/Sat 24 Oct/i.test(t)) fail('Sat 24 Oct missing in week 1')
let w1 = await page.$$('[role=checkbox]')
if (w1.length !== 1) fail('week 1 should have exactly 1 walk, got ' + w1.length)
const before = await page.evaluate(() => { const e = JSON.parse(localStorage.getItem('mammutmarsch-diary-v1') || '{"entries":{}}').entries['w1-sat']; return e ? e.completed : false })
if (before) fail('week 1 walk should start unchecked')
const kmBefore = await page.evaluate(() => Number((document.body.innerText.match(/([\d.]+) km walked/) || [])[1]))
await w1[0].click(); await new Promise((r) => setTimeout(r, 250))
t = await text()
const kmAfter = Number((t.match(/([\d.]+) km walked/) || [])[1])
if (kmAfter - kmBefore !== 10) fail(`ticking week 1 should add 10 km (before ${kmBefore}, after ${kmAfter})`)
await overflow('week1'); await page.screenshot({ path: `${shots}/${tag}-week1.png`, fullPage: true })
// navigate all weeks
for (let i = 0; i < 20; i++) { const b = await page.$('button[aria-label="Next week"]:not([disabled])'); if (!b) break; await b.click() }
t = await text()
if (!t.includes('Week 20 of 20') || !t.includes('Mammutmarsch Leipzig') || !/Sat 6 Mar/i.test(t)) fail('week 20 / event on Sat 6 Mar missing')
await overflow('week20'); await page.screenshot({ path: `${shots}/${tag}-week20.png`, fullPage: true })
await clickText('nav button', 'Settings')
await overflow('settings'); await page.screenshot({ path: `${shots}/${tag}-settings.png`, fullPage: true })
// offline (prod only, after SW active)
if (process.env.OFFLINE) {
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload({ waitUntil: 'networkidle0' })
  await page.setOfflineMode(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 800))
  if (!(await text()).includes('My Mammutmarsch Diary')) fail('offline reload failed')
  else console.log('offline OK')
  await page.setOfflineMode(false)
}
await browser.close()
console.log(process.exitCode ? 'E2E FAILED' : `E2E PASSED (${tag})`)
