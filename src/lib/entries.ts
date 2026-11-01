import { SESSION_BY_ID, isSwimEligible } from './plan'
import type { Activity, AppData, Entry } from './storage'

/** What a plain tick means for a session: a swim on a swim Saturday, the planned walk everywhere else. */
export const defaultActivity = (id: string): Activity => (isSwimEligible(SESSION_BY_ID[id]) ? 'swim' : 'walk')

/** Tick a session off. On a swim Saturday a tick is a swim unless she logs a walk; anything else is the planned walk.
 *  A swim never touches the plan or later distances; it is only recorded as its own activity. */
export function completeEntry(d: AppData, id: string, activity?: Activity, now = new Date().toISOString()): AppData {
  const prev: Entry = d.entries[id] ?? { completed: false }
  const s = SESSION_BY_ID[id]
  if (!s) return d
  const swimDay = isSwimEligible(s)
  const act = activity ?? defaultActivity(id)
  const swim = act === 'swim' && swimDay
  // On a swim Saturday no walk is planned, so a walk keeps only the km she entered (nothing is filled in for her).
  const next: Entry = { ...prev, completed: true, completedAt: now, actualKm: swim || swimDay ? prev.actualKm : prev.actualKm ?? s.plannedKm }
  if (swim) next.activity = 'swim'
  else if (swimDay) next.activity = 'walk'
  else delete next.activity
  return { ...d, entries: { ...d.entries, [id]: next } }
}

/** Switch a ticked swim Saturday between swim and walk without unticking it. */
export function setEntryActivity(d: AppData, id: string, activity: Activity): AppData {
  const prev = d.entries[id]
  const s = SESSION_BY_ID[id]
  if (!prev || !s || !isSwimEligible(s)) return d
  const next: Entry = { ...prev, activity }
  return { ...d, entries: { ...d.entries, [id]: next } }
}

/** Untick a session. Unticking returns a swim Saturday to its planned default (the swim). */
export function uncompleteEntry(d: AppData, id: string): AppData {
  const prev = d.entries[id]
  if (!prev) return d
  const next: Entry = { ...prev, completed: false, completedAt: undefined }
  delete next.activity
  return { ...d, entries: { ...d.entries, [id]: next } }
}
