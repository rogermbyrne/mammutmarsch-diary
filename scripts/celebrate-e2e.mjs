// Headless check that celebrations fire on tick (not on untick) and respect reduced motion.
// Usage: node scripts/celebrate-e2e.mjs http://localhost:4173/   Frames saved to OUT (default repo root).
import puppeteer from 'puppeteer-core'
const BASE = process.argv[2] || 'http://localhost:4173/'
const OUT = process.env.OUT || '/workspace/mammutmarsch-diary'
const FAKE = '2026-10-31T19:00:00+01:00' // Sat of week 2, so the Saturday tick finishes the week
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] })
const page = await browser.newPage()
page.on('pageerror', (e) => fail('pageerror ' + e.message))
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.evaluateOnNewDocument((iso) => {
  const fixed = new Date(iso).getTime(); const RD = Date
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(fixed) } static now() { return fixed } }
  Date = FD // eslint-disable-line no-global-assign
  window.__vib = []; navigator.vibrate = (p) => { window.__vib.push(p); return true }
}, FAKE)
const state = () => page.evaluate(() => ({
  canvas: !!document.querySelector('canvas[data-celebration]'),
  ring: !!document.querySelector('[data-celebration="ring"]'),
  msg: document.querySelector('[data-celebration="message"]')?.textContent || null,
  vib: window.__vib.length,
}))
const waitClear = async () => { for (let i = 0; i < 50 && (await state()).canvas; i++) await sleep(100) }
// Seed: intro walk done, so the next tick is an ordinary one.
await page.goto(BASE, { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.setItem('mammutmarsch-diary-v1', JSON.stringify({ version: 1, displayName: 'Andrea', entries: { 'w1-sat': { completed: true, actualKm: 10 } }, weekNotes: {}, seenMilestones: [] })))
await page.reload({ waitUntil: 'networkidle0' })
await page.evaluate(() => [...document.querySelectorAll('nav button')].find((b) => b.textContent.includes('Diary')).click())
await sleep(300)
let boxes = await page.$$('[role=checkbox]')
// 1) small tick
await boxes[0].tap(); await sleep(180)
let s = await state()
if (!s.canvas || !s.ring) fail('small tick: no confetti / ring ' + JSON.stringify(s))
if (s.msg) fail('small tick should not show a message: ' + s.msg)
if (s.vib < 1) fail('small tick: no haptic call')
await page.screenshot({ path: `${OUT}/celebration-1-small.png` })
await waitClear()
if ((await state()).canvas) fail('canvas not cleaned up')
// 2) untick: nothing
const v0 = (await state()).vib
boxes = await page.$$('[role=checkbox]'); await boxes[0].tap(); await sleep(180)
s = await state()
if (s.canvas || s.vib !== v0) fail('untick should not celebrate ' + JSON.stringify(s))
// 3) tick Tue + Thu (small), then Sat finishes week 2 (big)
boxes = await page.$$('[role=checkbox]'); await boxes[0].tap(); await sleep(150)
boxes = await page.$$('[role=checkbox]'); await boxes[1].tap(); await waitClear()
boxes = await page.$$('[role=checkbox]'); await boxes[2].tap()
await sleep(250); s = await state()
if (!s.canvas || s.msg !== 'Week 2 complete!') fail('week complete: ' + JSON.stringify(s))
await page.screenshot({ path: `${OUT}/celebration-2-week-a.png` })
await sleep(450); await page.screenshot({ path: `${OUT}/celebration-3-week-b.png` })
await sleep(600); await page.screenshot({ path: `${OUT}/celebration-4-week-c.png` })
await waitClear()
// 4) Today tab "Mark Complete" also celebrates
await page.evaluate(() => localStorage.setItem('mammutmarsch-diary-v1', JSON.stringify({ version: 1, displayName: '', entries: { 'w1-sat': { completed: true, actualKm: 10 } }, weekNotes: {}, seenMilestones: [] })))
await page.reload({ waitUntil: 'networkidle0' })
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Mark Complete')).click()); await sleep(150)
s = await state(); if (!s.canvas || !s.msg) fail('Today Mark Complete (12 km, new longest) did not celebrate big ' + JSON.stringify(s))
await page.screenshot({ path: `${OUT}/celebration-6-today-record.png` }); console.log('today msg:', s.msg)
await waitClear()
// 5) reduced motion: no confetti, gentle glow + message only
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await page.evaluate(() => localStorage.setItem('mammutmarsch-diary-v1', JSON.stringify({ version: 1, displayName: '', entries: {}, weekNotes: {}, seenMilestones: [] })))
await page.reload({ waitUntil: 'networkidle0' })
await page.evaluate(() => [...document.querySelectorAll('nav button')].find((b) => b.textContent.includes('Diary')).click()); await sleep(300)
boxes = await page.$$('[role=checkbox]'); await boxes[0].tap(); await sleep(200)
s = await state()
if (s.canvas || !s.ring) fail('reduced motion: ' + JSON.stringify(s))
await page.screenshot({ path: `${OUT}/celebration-5-reduced-motion.png` })
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mammutmarsch-diary-v1')).entries)
if (!Object.values(saved).some((e) => e.completed)) fail('tick not persisted')
await browser.close()
console.log(process.exitCode ? 'CELEBRATE E2E FAILED' : 'CELEBRATE E2E PASSED')
