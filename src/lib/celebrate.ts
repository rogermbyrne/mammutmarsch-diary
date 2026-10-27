/** Small, dependency-free celebrations: a canvas confetti burst plus an optional short message.
 *  Works offline (no assets), honours prefers-reduced-motion and never blocks taps. */

export type CelebrationLevel = 'small' | 'big' | 'finish'

const COLORS = ['#3A956C', '#C4EAA4', '#193D35', '#D8EDE1', '#E8B45A', '#7CC49A']

let lastPoint: { x: number; y: number } | null = null
let installed = false

/** Remember where the last tap happened so a small burst can start at the ticked item. */
export function trackPointer() {
  if (installed || typeof document === 'undefined') return
  installed = true
  document.addEventListener('pointerdown', (e) => { lastPoint = { x: e.clientX, y: e.clientY } }, { capture: true, passive: true })
  document.addEventListener('keydown', () => { lastPoint = null }, { capture: true, passive: true })
}

/** Where to start a burst: the last tap, else the focused control, else the middle of the screen. */
export function currentOrigin(): { x: number; y: number } {
  if (lastPoint) return lastPoint
  const el = document.activeElement as HTMLElement | null
  if (el && el !== document.body && el.getBoundingClientRect) {
    const r = el.getBoundingClientRect()
    if (r.width || r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function vibrate(level: CelebrationLevel) {
  try { navigator.vibrate?.(level === 'small' ? 12 : level === 'big' ? [18, 60, 18] : [20, 60, 20, 60, 40]) } catch { /* unsupported */ }
}

interface P { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; color: string; life: number; age: number; round: boolean }

let canvas: HTMLCanvasElement | null = null
let particles: P[] = []
let raf = 0
let last = 0

function ensureCanvas(): CanvasRenderingContext2D | null {
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    canvas.dataset.celebration = 'confetti'
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:70'
    document.body.appendChild(canvas)
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth, h = window.innerHeight
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
  }
  const ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

function burst(x: number, y: number, count: number, opts: { spread: number; angle: number; speed: number; life: number; size: number }) {
  for (let i = 0; i < count; i++) {
    const a = opts.angle + (Math.random() - 0.5) * opts.spread
    const sp = opts.speed * (0.45 + Math.random() * 0.75)
    const s = opts.size * (0.7 + Math.random() * 0.6)
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 12,
      w: s, h: s * (0.45 + Math.random() * 0.4), color: COLORS[(Math.random() * COLORS.length) | 0],
      life: opts.life * (0.75 + Math.random() * 0.5), age: 0, round: Math.random() < 0.3,
    })
  }
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick) }
}

function tick(now: number) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now
  const ctx = ensureCanvas()
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  particles = particles.filter((p) => p.age < p.life)
  for (const p of particles) {
    p.age += dt
    p.vy += 900 * dt // gravity
    p.vx *= 1 - 1.6 * dt; p.vy *= 1 - 1.2 * dt // air drag
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt
    const fade = Math.min(1, (p.life - p.age) / 0.35)
    ctx.globalAlpha = Math.max(0, fade)
    ctx.fillStyle = p.color
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
    if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h * 0.6, 0, Math.PI * 2); ctx.fill() }
    else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.3)) + 1)
    ctx.restore()
  }
  ctx.globalAlpha = 1
  if (particles.length) raf = requestAnimationFrame(tick)
  else { raf = 0; canvas.remove(); canvas = null }
}

/** A soft ring that expands from the tap point. Used alone when reduced motion is on (opacity only). */
function ring(x: number, y: number, gentle: boolean) {
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.dataset.celebration = 'ring'
  el.className = gentle ? 'celebrate-ring celebrate-ring-gentle' : 'celebrate-ring'
  el.style.left = `${x}px`; el.style.top = `${y}px`
  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), 900)
}

let msgTimer = 0
function message(text: string, level: CelebrationLevel) {
  document.querySelectorAll('[data-celebration="message"]').forEach((n) => n.remove())
  window.clearTimeout(msgTimer)
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.dataset.celebration = 'message'
  el.className = `celebrate-msg${level === 'finish' ? ' celebrate-msg-finish' : ''}`
  el.textContent = text
  document.body.appendChild(el)
  msgTimer = window.setTimeout(() => el.remove(), level === 'finish' ? 4200 : 2800)
}

export function celebrate(level: CelebrationLevel, opts: { origin?: { x: number; y: number }; text?: string } = {}) {
  if (typeof window === 'undefined') return
  const o = opts.origin ?? currentOrigin()
  vibrate(level)
  if (opts.text && level !== 'small') message(opts.text, level)
  if (reducedMotion()) { ring(o.x, o.y, true); return }
  const W = window.innerWidth, H = window.innerHeight
  ring(o.x, o.y, false)
  if (level === 'small') {
    burst(o.x, o.y, 26, { spread: Math.PI * 2, angle: -Math.PI / 2, speed: 340, life: 0.9, size: 7 })
    return
  }
  // Bigger moments: a burst at the item plus two soft cannons from the lower corners.
  burst(o.x, o.y, 30, { spread: Math.PI * 2, angle: -Math.PI / 2, speed: 380, life: 1.1, size: 8 })
  const side = (n: number, life: number) => {
    burst(-10, H * 0.75, n, { spread: 0.7, angle: -Math.PI / 3, speed: 1100, life, size: 9 })
    burst(W + 10, H * 0.75, n, { spread: 0.7, angle: (-Math.PI * 2) / 3, speed: 1100, life, size: 9 })
  }
  side(level === 'finish' ? 70 : 50, 2.0)
  if (level === 'finish') {
    window.setTimeout(() => side(55, 2.2), 450)
    window.setTimeout(() => burst(W / 2, H * 0.35, 80, { spread: Math.PI * 2, angle: -Math.PI / 2, speed: 650, life: 2.2, size: 9 }), 900)
  }
}
