import { addDays, type ISODate } from './dates'

export type WalkType = 'easy' | 'steady' | 'long' | 'swim' | 'event'

export interface Session {
  id: string
  week: number
  date: ISODate // originally scheduled date
  type: WalkType
  plannedKm: number // 0 on a swim Saturday: no walk is planned there
  isEvent: boolean
}

export interface Week {
  number: number
  start: ISODate // Monday
  end: ISODate // Sunday
  /** Even weeks 4 to 16: the Saturday is a swim day (no long walk planned), which gives the joints a week off long distances. */
  swimWeek: boolean
  /** Weeks 17 to 19: easing down before the event. */
  taper: boolean
  sessions: Session[]
}

// Andrea's plan (handwritten, Nov 2026), built around a knee and a hip that need care:
// a long walk every other Saturday (odd weeks 3 to 17), a "maybe swimming" Saturday in the weeks between (even weeks 4 to 16),
// and no Saturday long walk in weeks 18 and 19 (rest and taper). Tue and Thu walks are unchanged.
// Week 1 is a short intro week (Sat 17 Oct to Sun 25 Oct 2026) with a single 10 km long walk on Sat 24 Oct.
// Weeks 2 to 20 are Monday-anchored from WEEK2_START.
export const TRAINING_START: ISODate = '2026-10-17'
export const WEEK2_START: ISODate = '2026-10-26'
export const INTRO_WALK_DATE: ISODate = '2026-10-24'
export const INTRO_WALK_KM = 10
export const EVENT_DATE: ISODate = '2027-03-06'
export const EVENT_KM = 42
export const TOTAL_WEEKS = 20
export const TAPER_WEEKS = [17, 18, 19]

// [Tuesday, Thursday] km for weeks 2-19 (unchanged from the first plan); week 20 has Tue/Thu + the event.
const WEEKDAY_KM: [number, number][] = [
  [4, 5], [5, 5], [5, 6], [4, 5], [5, 7], [6, 7],
  [6, 8], [4, 6], [6, 8], [6, 8], [7, 9], [5, 6],
  [7, 9], [7, 10], [5, 7], [7, 10], [5, 7], [4, 5],
]
/** Saturday long walks by week. Weeks not listed (4 to 16 even) are swim Saturdays; 18 and 19 have no Saturday session. */
export const LONG_WALK_KM: Record<number, number> = { 2: 12, 3: 15, 5: 18, 7: 21, 9: 24, 11: 27, 13: 30, 15: 33, 17: 13 }
export const SWIM_WEEKS = [4, 6, 8, 10, 12, 14, 16]
const RACE_WEEK: [number, number] = [3, 3]

/** Saturday km in the first plan (before 1 Nov 2026), weeks 2-19. Only used to keep old saved entries exactly as she logged them. */
export const LEGACY_SAT_KM: Record<number, number> = {
  2: 12, 3: 13, 4: 15, 5: 10, 6: 16, 7: 18, 8: 20, 9: 13, 10: 21, 11: 23, 12: 25, 13: 16, 14: 26, 15: 28, 16: 20, 17: 32, 18: 20, 19: 12,
}
/** Saturdays that offered "swim instead" in the old plan. A swim already saved on one of them is kept as she logged it. */
export const LEGACY_SWIM_IDS = ['w3-sat', 'w5-sat', 'w7-sat', 'w9-sat', 'w11-sat', 'w13-sat', 'w15-sat', 'w17-sat', 'w19-sat']
/** Sessions that existed in the old plan but not in this one. Saved entries for them are archived, never dropped. */
export const RETIRED_IDS = ['w18-sat', 'w19-sat']

export const TYPE_LABEL: Record<WalkType, string> = {
  easy: 'Easy walk',
  steady: 'Steady walk',
  long: 'Long endurance walk',
  swim: 'Swim day',
  event: 'Mammutmarsch Leipzig',
}

export const TYPE_HINT: Record<WalkType, string> = {
  easy: 'Relaxed pace. You should be able to chat comfortably.',
  steady: 'A purposeful, even pace. Slightly brisk but sustainable.',
  long: 'Time on your feet. Go slow, eat, drink and test your gear.',
  swim: 'Maybe a swim today. No long walk is planned, so your knees and hips get a rest from distance.',
  event: 'The big day. 42 km of Mammutmarsch. You have trained for this!',
}

function buildWeeks(): Week[] {
  const weeks: Week[] = [{
    number: 1,
    start: TRAINING_START,
    end: addDays(WEEK2_START, -1),
    swimWeek: false,
    taper: false,
    sessions: [{ id: 'w1-sat', week: 1, date: INTRO_WALK_DATE, type: 'long', plannedKm: INTRO_WALK_KM, isEvent: false }],
  }]
  for (let w = 2; w <= TOTAL_WEEKS; w++) {
    const start = addDays(WEEK2_START, (w - 2) * 7)
    const tue = addDays(start, 1)
    const thu = addDays(start, 3)
    const sat = addDays(start, 5)
    const sessions: Session[] = []
    if (w < TOTAL_WEEKS) {
      const [a, b] = WEEKDAY_KM[w - 2]
      sessions.push(
        { id: `w${w}-tue`, week: w, date: tue, type: 'easy', plannedKm: a, isEvent: false },
        { id: `w${w}-thu`, week: w, date: thu, type: 'steady', plannedKm: b, isEvent: false },
      )
      if (LONG_WALK_KM[w] !== undefined) sessions.push({ id: `w${w}-sat`, week: w, date: sat, type: 'long', plannedKm: LONG_WALK_KM[w], isEvent: false })
      else if (SWIM_WEEKS.includes(w)) sessions.push({ id: `w${w}-sat`, week: w, date: sat, type: 'swim', plannedKm: 0, isEvent: false })
    } else {
      sessions.push(
        { id: `w${w}-tue`, week: w, date: tue, type: 'easy', plannedKm: RACE_WEEK[0], isEvent: false },
        { id: `w${w}-thu`, week: w, date: thu, type: 'steady', plannedKm: RACE_WEEK[1], isEvent: false },
        { id: 'event', week: w, date: sat, type: 'event', plannedKm: EVENT_KM, isEvent: true },
      )
    }
    weeks.push({ number: w, start, end: addDays(start, 6), swimWeek: SWIM_WEEKS.includes(w), taper: TAPER_WEEKS.includes(w), sessions })
  }
  return weeks
}

export const WEEKS: Week[] = buildWeeks()
export const ALL_SESSIONS: Session[] = WEEKS.flatMap((w) => w.sessions)
export const TRAINING_SESSIONS: Session[] = ALL_SESSIONS.filter((s) => !s.isEvent)
export const EVENT_SESSION: Session = ALL_SESSIONS.find((s) => s.isEvent)!
export const SESSION_BY_ID: Record<string, Session> = Object.fromEntries(ALL_SESSIONS.map((s) => [s.id, s]))
/** Her longest training walk (33 km, Sat 30 Jan 2027). */
export const PEAK_LONG_ID = 'w15-sat'
/** Her last long walk before the event (13 km, Sat 13 Feb 2027). */
export const FINAL_LONG_ID = 'w17-sat'

export function weekForDate(d: ISODate): number {
  if (d < TRAINING_START) return 1
  const w = WEEKS.find((wk) => d >= wk.start && d <= wk.end)
  return w ? w.number : TOTAL_WEEKS
}

// Swim Saturdays: even weeks 4 to 16 (14 Nov, 28 Nov, 12 Dec, 26 Dec, 9 Jan, 23 Jan, 6 Feb). Swimming is the default.
// She can tick "I swam", or log a walk with whatever km she actually did. Either way the day counts as done.
// A swim never counts as walking km, and no km are planned on these days.
export const SWIM_LABEL = 'Swim'
export const SWIM_HINT = 'Swimming is the plan today. Went for a walk instead? Log it with the km you walked.'

/** True for a swim Saturday (her "maybe swimming" days). */
export function isSwimEligible(s: Session | undefined): boolean {
  return !!s && s.type === 'swim'
}

export const SWIM_ELIGIBLE_SESSIONS: Session[] = ALL_SESSIONS.filter(isSwimEligible)
