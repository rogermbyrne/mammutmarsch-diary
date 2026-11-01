import { SESSION_BY_ID, isSwimEligible } from './plan'
import type { Activity, AppData, Entry } from './storage'

/** Tick a session off. On a swim-or-walk Saturday she can tick it as a swim; anything else is the planned walk.
 *  A swim never touches the plan or later distances; it is only recorded as its own activity. */
export function completeEntry(d: AppData, id: string, activity: Activity = 'walk', now = new Date().toISOString()): AppData {
  const prev: Entry = d.entries[id] ?? { completed: false }
  const s = SESSION_BY_ID[id]
  if (!s) return d
  const swim = activity === 'swim' && isSwimEligible(s)
  const next: Entry = { ...prev, completed: true, completedAt: now, actualKm: swim ? prev.actualKm : prev.actualKm ?? s.plannedKm }
  if (swim) next.activity = 'swim'
  else delete next.activity
  return { ...d, entries: { ...d.entries, [id]: next } }
}

/** Switch a ticked swim-or-walk Saturday between walk and swim without unticking it. */
export function setEntryActivity(d: AppData, id: string, activity: Activity): AppData {
  const prev = d.entries[id]
  const s = SESSION_BY_ID[id]
  if (!prev || !s || !isSwimEligible(s)) return d
  const next: Entry = { ...prev }
  if (activity === 'swim') next.activity = 'swim'
  else { delete next.activity; if (next.completed && next.actualKm === undefined) next.actualKm = s.plannedKm }
  return { ...d, entries: { ...d.entries, [id]: next } }
}

/** Untick a session. Unticking returns a swim-or-walk Saturday to its planned default (the long walk). */
export function uncompleteEntry(d: AppData, id: string): AppData {
  const prev = d.entries[id]
  if (!prev) return d
  const next: Entry = { ...prev, completed: false, completedAt: undefined }
  delete next.activity
  return { ...d, entries: { ...d.entries, [id]: next } }
}
