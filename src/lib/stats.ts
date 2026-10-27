import type { ISODate } from './dates'
import { daysBetween } from './dates'
import {
  ALL_SESSIONS, EVENT_DATE, EVENT_SESSION, FINAL_LONG_ID, SESSION_BY_ID, TRAINING_SESSIONS, WEEKS, type Session,
} from './plan'
import type { AppData, Entry } from './storage'

export type Status = 'completed' | 'upcoming' | 'today' | 'missed'

export const effectiveDate = (s: Session, data: AppData): ISODate => data.entries[s.id]?.rescheduledDate ?? s.date
export const isDone = (s: Session, data: AppData): boolean => data.entries[s.id]?.completed === true
/** Distance that counts toward every total: the logged actual km for a completed walk,
 *  falling back to the planned km only if no actual was logged. Not completed counts 0. */
export const kmFor = (s: Session, e: Entry | undefined): number =>
  e?.completed ? (typeof e.actualKm === 'number' ? e.actualKm : s.plannedKm) : 0

export function statusOf(s: Session, data: AppData, today: ISODate): Status {
  if (isDone(s, data)) return 'completed'
  const d = effectiveDate(s, data)
  if (d < today) return 'missed'
  if (d === today) return 'today'
  return 'upcoming'
}

export function sortedSessions(data: AppData): Session[] {
  return [...ALL_SESSIONS].sort((a, b) => {
    const da = effectiveDate(a, data), db = effectiveDate(b, data)
    return da < db ? -1 : da > db ? 1 : ALL_SESSIONS.indexOf(a) - ALL_SESSIONS.indexOf(b)
  })
}

/** Uncompleted sessions from today onwards, in date order. */
export function upcomingSessions(data: AppData, today: ISODate): Session[] {
  return sortedSessions(data).filter((s) => !isDone(s, data) && effectiveDate(s, data) >= today)
}

export function missedSessions(data: AppData, today: ISODate): Session[] {
  return sortedSessions(data).filter((s) => statusOf(s, data, today) === 'missed')
}

export interface Stats {
  completed: number
  total: number
  percent: number
  trainingKm: number
  totalKm: number // training + event if completed
  hours: number
  longestKm: number
  streak: number
  eventDone: boolean
  daysToEvent: number
}

export function computeStats(data: AppData, today: ISODate): Stats {
  let completed = 0, trainingKm = 0, minutes = 0, longestKm = 0
  for (const s of TRAINING_SESSIONS) {
    const e = data.entries[s.id]
    if (!e?.completed) continue
    completed++
    const km = kmFor(s, e)
    trainingKm += km
    longestKm = Math.max(longestKm, km)
    if (e.durationMin) minutes += e.durationMin
  }
  const eventEntry = data.entries[EVENT_SESSION.id]
  const eventDone = eventEntry?.completed === true
  return {
    completed,
    total: TRAINING_SESSIONS.length,
    percent: Math.round((completed / TRAINING_SESSIONS.length) * 100),
    trainingKm: round1(trainingKm),
    totalKm: round1(trainingKm + (eventDone ? kmFor(EVENT_SESSION, eventEntry) : 0)),
    hours: round1(minutes / 60),
    longestKm: round1(longestKm),
    streak: computeStreak(data, today),
    eventDone,
    daysToEvent: Math.max(0, daysBetween(today, EVENT_DATE)),
  }
}

/** Consecutive scheduled training sessions completed, counting back from the most recent one.
 *  Sessions later than today that are not done yet do not break the streak, nor does today's if not done yet. */
export function computeStreak(data: AppData, today: ISODate): number {
  const list = sortedSessions(data).filter((s) => !s.isEvent)
  let streak = 0
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i]
    const done = isDone(s, data)
    if (!done && effectiveDate(s, data) >= today) continue
    if (!done) break
    streak++
  }
  return streak
}

export const round1 = (n: number) => Math.round(n * 10) / 10

export interface WeekChartRow { week: string; planned: number; actual: number; walks: number }

export function weeklyChart(data: AppData): WeekChartRow[] {
  return WEEKS.map((w) => {
    const training = w.sessions.filter((s) => !s.isEvent)
    return {
      week: `W${w.number}`,
      planned: training.reduce((a, s) => a + s.plannedKm, 0),
      actual: round1(training.reduce((a, s) => a + kmFor(s, data.entries[s.id]), 0)),
      walks: training.filter((s) => isDone(s, data)).length,
    }
  })
}

export interface LongRow { week: string; planned: number; actual: number | null }

export function longWalkChart(data: AppData): LongRow[] {
  return WEEKS.map((w) => {
    const s = w.sessions.find((x) => x.type === 'long' || x.type === 'event')!
    const e = data.entries[s.id]
    return { week: `W${w.number}`, planned: s.plannedKm, actual: e?.completed ? kmFor(s, e) : null }
  })
}

export interface Milestone { id: string; title: string; detail: string; unlocked: boolean }

export function milestones(data: AppData): Milestone[] {
  const done = TRAINING_SESSIONS.filter((s) => isDone(s, data))
  const kms = ALL_SESSIONS.filter((s) => isDone(s, data)).map((s) => kmFor(s, data.entries[s.id]))
  const maxKm = kms.length ? Math.max(...kms) : 0
  return [
    { id: 'first', title: 'First walk done', detail: 'You ticked off your first training walk.', unlocked: done.length >= 1 },
    { id: 'km20', title: 'First 20 km walk', detail: 'Recorded a walk of 20 km or more.', unlocked: maxKm >= 20 },
    { id: 'km25', title: 'First 25 km walk', detail: 'Recorded a walk of 25 km or more.', unlocked: maxKm >= 25 },
    { id: 'km30', title: 'First 30 km walk', detail: 'Recorded a walk of 30 km or more.', unlocked: maxKm >= 30 },
    { id: 'half', title: 'Halfway there', detail: `Completed 50% of your training walks (${Math.ceil(TRAINING_SESSIONS.length / 2)} of ${TRAINING_SESSIONS.length}).`, unlocked: done.length >= TRAINING_SESSIONS.length / 2 },
    { id: 'finallong', title: 'Final long walk done', detail: `Completed the last long training walk (Week ${SESSION_BY_ID[FINAL_LONG_ID].week}).`, unlocked: isDone(ALL_SESSIONS.find((s) => s.id === FINAL_LONG_ID)!, data) },
    { id: 'finish', title: 'Mammutmarsch finisher', detail: 'You walked the 42 km Mammutmarsch Leipzig!', unlocked: isDone(EVENT_SESSION, data) },
  ]
}

/** Average pace (min/km) across completed long walks with a recorded duration. */
export function longWalkPace(data: AppData): { pace: number; walks: number } | null {
  let km = 0, min = 0, walks = 0
  for (const s of TRAINING_SESSIONS) {
    const e = data.entries[s.id]
    if (s.type !== 'long' || !e?.completed || !e.durationMin) continue
    const k = kmFor(s, e)
    if (k <= 0) continue
    km += k; min += e.durationMin; walks++
  }
  return walks ? { pace: min / km, walks } : null
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

export function formatKm(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** Walked (actual) and planned training km for one plan week. */
export function weekTotals(data: AppData, week: number): { walkedKm: number; plannedKm: number } {
  const training = WEEKS[week - 1].sessions.filter((s) => !s.isEvent)
  return {
    walkedKm: round1(training.reduce((a, s) => a + kmFor(s, data.entries[s.id]), 0)),
    plannedKm: training.reduce((a, s) => a + s.plannedKm, 0),
  }
}

export interface MonthRow { key: string; year: number; month: number; walkedKm: number; plannedKm: number; walks: number }

/** Walked (actual) vs planned km per calendar month, by the date each walk was done (or is scheduled). Includes the event. */
export function monthlyTotals(data: AppData): MonthRow[] {
  const rows = new Map<string, MonthRow>()
  for (const s of sortedSessions(data)) {
    const d = effectiveDate(s, data)
    const key = d.slice(0, 7)
    const row = rows.get(key) ?? { key, year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)), walkedKm: 0, plannedKm: 0, walks: 0 }
    row.plannedKm += s.plannedKm
    if (isDone(s, data)) { row.walkedKm = round1(row.walkedKm + kmFor(s, data.entries[s.id])); row.walks++ }
    rows.set(key, row)
  }
  return [...rows.values()].sort((a, b) => (a.key < b.key ? -1 : 1))
}

export interface CelebrationInfo { level: 'small' | 'big' | 'finish'; text?: string }

/** Decide how big a celebration a fresh tick deserves, comparing the data just before and just after it. */
export function celebrationFor(id: string, before: AppData, after: AppData): CelebrationInfo {
  const s = SESSION_BY_ID[id]
  if (!s) return { level: 'small' }
  if (s.isEvent) return { level: 'finish', text: 'Mammutmarsch finisher! 42 km. You did it!' }
  const prevUnlocked = new Set(milestones(before).filter((m) => m.unlocked).map((m) => m.id))
  const fresh = milestones(after).filter((m) => m.unlocked && !prevUnlocked.has(m.id) && m.id !== 'first')
  if (fresh.length) return { level: 'big', text: `${fresh[fresh.length - 1].title}!` }
  const week = WEEKS[s.week - 1]
  const training = week.sessions.filter((x) => !x.isEvent)
  if (training.length > 1 && training.every((x) => isDone(x, after)) && !training.every((x) => isDone(x, before))) {
    return { level: 'big', text: `Week ${s.week} complete!` }
  }
  const prevKms = TRAINING_SESSIONS.filter((x) => x.id !== id && isDone(x, before)).map((x) => kmFor(x, before.entries[x.id]))
  const km = kmFor(s, after.entries[id])
  if (prevKms.length && km > Math.max(...prevKms)) return { level: 'big', text: `New longest walk: ${formatKm(km)} km!` }
  if (TRAINING_SESSIONS.filter((x) => isDone(x, before)).length === 0) return { level: 'big', text: 'First walk done!' }
  return { level: 'small' }
}
