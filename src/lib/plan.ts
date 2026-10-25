import { addDays, type ISODate } from './dates'

export type WalkType = 'easy' | 'steady' | 'long' | 'event'

export interface Session {
  id: string
  week: number
  date: ISODate // originally scheduled date
  type: WalkType
  plannedKm: number
  isEvent: boolean
}

export interface Week {
  number: number
  start: ISODate // Monday
  end: ISODate // Sunday
  recovery: boolean
  sessions: Session[]
}

export const TRAINING_START: ISODate = '2026-10-19'
export const EVENT_DATE: ISODate = '2027-03-06'
export const EVENT_KM = 42
export const TOTAL_WEEKS = 20
export const RECOVERY_WEEKS = [5, 9, 13, 16, 18, 19]

// [Tuesday, Thursday, Saturday] km for weeks 1-19; week 20 has Tue/Thu + the event.
// Week 1 is the baseline week: its Saturday (24 Oct 2026) is the 10 km walk already done.
const DISTANCES: [number, number, number][] = [
  [4, 5, 10],
  [4, 5, 12], [5, 5, 13], [5, 6, 15], [4, 5, 10], [5, 7, 16], [6, 7, 18],
  [6, 8, 20], [4, 6, 13], [6, 8, 21], [6, 8, 23], [7, 9, 25], [5, 6, 16],
  [7, 9, 26], [7, 10, 28], [5, 7, 20], [7, 10, 32], [5, 7, 20], [4, 5, 12],
]
const RACE_WEEK: [number, number] = [3, 3]

export const TYPE_LABEL: Record<WalkType, string> = {
  easy: 'Easy walk',
  steady: 'Steady walk',
  long: 'Long endurance walk',
  event: 'Mammutmarsch Leipzig',
}

export const TYPE_HINT: Record<WalkType, string> = {
  easy: 'Relaxed pace. You should be able to chat comfortably.',
  steady: 'A purposeful, even pace. Slightly brisk but sustainable.',
  long: 'Time on your feet. Go slow, eat, drink and test your gear.',
  event: 'The big day. 42 km of Mammutmarsch. You have trained for this!',
}

function buildWeeks(): Week[] {
  const weeks: Week[] = []
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    const start = addDays(TRAINING_START, (w - 1) * 7)
    const tue = addDays(start, 1)
    const thu = addDays(start, 3)
    const sat = addDays(start, 5)
    const sessions: Session[] = []
    if (w < TOTAL_WEEKS) {
      const [a, b, c] = DISTANCES[w - 1]
      sessions.push(
        { id: `w${w}-tue`, week: w, date: tue, type: 'easy', plannedKm: a, isEvent: false },
        { id: `w${w}-thu`, week: w, date: thu, type: 'steady', plannedKm: b, isEvent: false },
        { id: `w${w}-sat`, week: w, date: sat, type: 'long', plannedKm: c, isEvent: false },
      )
    } else {
      sessions.push(
        { id: `w${w}-tue`, week: w, date: tue, type: 'easy', plannedKm: RACE_WEEK[0], isEvent: false },
        { id: `w${w}-thu`, week: w, date: thu, type: 'steady', plannedKm: RACE_WEEK[1], isEvent: false },
        { id: 'event', week: w, date: sat, type: 'event', plannedKm: EVENT_KM, isEvent: true },
      )
    }
    weeks.push({ number: w, start, end: addDays(start, 6), recovery: RECOVERY_WEEKS.includes(w), sessions })
  }
  return weeks
}

export const WEEKS: Week[] = buildWeeks()
export const ALL_SESSIONS: Session[] = WEEKS.flatMap((w) => w.sessions)
export const TRAINING_SESSIONS: Session[] = ALL_SESSIONS.filter((s) => !s.isEvent)
export const EVENT_SESSION: Session = ALL_SESSIONS.find((s) => s.isEvent)!
export const SESSION_BY_ID: Record<string, Session> = Object.fromEntries(ALL_SESSIONS.map((s) => [s.id, s]))
export const FINAL_LONG_ID = 'w19-sat'

export function weekForDate(d: ISODate): number {
  if (d < TRAINING_START) return 1
  const w = WEEKS.find((wk) => d >= wk.start && d <= wk.end)
  return w ? w.number : TOTAL_WEEKS
}
