// All dates are plain calendar dates ("YYYY-MM-DD"). Arithmetic is done in UTC on
// date-only values so there is never any timezone or daylight-saving shifting.

export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

export function parseISO(d: ISODate): { y: number; m: number; day: number } {
  const [y, m, day] = d.split('-').map(Number)
  return { y, m, day }
}

export function toUTC(d: ISODate): number {
  const { y, m, day } = parseISO(d)
  return Date.UTC(y, m - 1, day)
}

export function fromUTC(ms: number): ISODate {
  const dt = new Date(ms)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * 86400000)
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86400000)
}

/** 0 = Monday ... 6 = Sunday */
export function weekdayIndex(d: ISODate): number {
  return (new Date(toUTC(d)).getUTCDay() + 6) % 7
}

export function isValidISO(d: unknown): d is ISODate {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  return fromUTC(toUTC(d)) === d
}

/** Today's calendar date in Europe/Berlin (falls back to the device's local date). */
export function todayBerlin(now: Date = new Date()): ISODate {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now)
    const get = (t: string) => parts.find((p) => p.type === t)?.value
    const s = `${get('year')}-${get('month')}-${get('day')}`
    if (isValidISO(s)) return s
  } catch {
    /* fall through */
  }
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function dayName(d: ISODate, short = false): string {
  const n = DAYS[weekdayIndex(d)]
  return short ? n.slice(0, 3) : n
}

export function monthName(m: number, short = false): string {
  const n = MONTHS[m - 1]
  return short ? n.slice(0, 3) : n
}

/** "Tuesday, 27 October" */
export function formatLong(d: ISODate, withYear = false): string {
  const { y, m, day } = parseISO(d)
  return `${dayName(d)}, ${day} ${monthName(m)}${withYear ? ` ${y}` : ''}`
}

/** "Tue 27 Oct" */
export function formatShort(d: ISODate): string {
  const { m, day } = parseISO(d)
  return `${dayName(d, true)} ${day} ${monthName(m, true)}`
}

/** "26 Oct – 1 Nov" */
export function formatRange(a: ISODate, b: ISODate): string {
  const A = parseISO(a), B = parseISO(b)
  const left = A.m === B.m && A.y === B.y ? `${A.day}` : `${A.day} ${monthName(A.m, true)}`
  const yr = A.y !== B.y ? ` ${B.y}` : ''
  return `${left} – ${B.day} ${monthName(B.m, true)}${yr}`
}
