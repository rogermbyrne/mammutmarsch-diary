import { isValidISO } from './dates'
import { LEGACY_SAT_KM, LEGACY_SWIM_IDS, RETIRED_IDS, SESSION_BY_ID, TOTAL_WEEKS, isSwimEligible } from './plan'

export type Difficulty = 'easy' | 'moderate' | 'hard'
/** What she did for a session. Missing means the planned walk (all data saved before swims existed). */
export type Activity = 'walk' | 'swim'

export interface Entry {
  completed: boolean
  completedAt?: string
  actualKm?: number
  durationMin?: number
  difficulty?: Difficulty
  notes?: string
  footIssues?: string
  rescheduledDate?: string
  /** 'swim' or 'walk' on a swim Saturday; absent = the planned walk. A swim saved on an old swim-or-walk Saturday
   *  (w3-sat, w5-sat, ...) is kept as she logged it. Optional, so v1 data needs no format change. */
  activity?: Activity
}

export interface AppData {
  version: 1
  displayName: string
  entries: Record<string, Entry>
  weekNotes: Record<string, string>
  seenMilestones: string[]
  updatedAt?: string
  /** Entries for sessions that the current plan no longer has (Sat 20 Feb and Sat 27 Feb 2027), kept so nothing is lost. */
  archived?: Record<string, Entry>
}

export const STORAGE_KEY = 'mammutmarsch-diary-v1'

export function emptyData(): AppData {
  return { version: 1, displayName: '', entries: {}, weekNotes: {}, seenMilestones: [] }
}

const num = (v: unknown, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : undefined
const str = (v: unknown, max = 5000): string | undefined =>
  typeof v === 'string' ? v.slice(0, max) : undefined

/** Validates and normalises unknown input. Throws an Error with a friendly message if it isn't diary data. */
export function validateData(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('This file does not contain diary data.')
  const r = raw as Record<string, unknown>
  if (r.app !== undefined && r.app !== 'my-mammutmarsch-diary') throw new Error('This file is from a different app.')
  const src = (r.data && typeof r.data === 'object' ? r.data : r) as Record<string, unknown>
  if (src.version !== 1) throw new Error('Unsupported or missing data version.')
  if (!src.entries || typeof src.entries !== 'object') throw new Error('The file is missing the walk entries.')
  const entries: Record<string, Entry> = {}
  const archived: Record<string, Entry> = {}
  const clean = (id: string, e: unknown): Entry => {
    if (!e || typeof e !== 'object') throw new Error(`Entry "${id}" is not valid.`)
    const x = e as Record<string, unknown>
    if (typeof x.completed !== 'boolean') throw new Error(`Entry "${id}" is missing its completed flag.`)
    const diff = x.difficulty
    const out: Entry = {
      completed: x.completed,
      completedAt: str(x.completedAt, 40),
      actualKm: num(x.actualKm, 200),
      durationMin: num(x.durationMin, 60 * 48),
      difficulty: diff === 'easy' || diff === 'moderate' || diff === 'hard' ? diff : undefined,
      notes: str(x.notes),
      footIssues: str(x.footIssues),
      rescheduledDate: isValidISO(x.rescheduledDate) ? x.rescheduledDate : undefined,
    }
    if (x.activity === 'swim' || x.activity === 'walk') out.activity = x.activity
    return out
  }
  // Archived entries from an earlier save are carried over unchanged.
  if (src.archived && typeof src.archived === 'object') {
    for (const [id, e] of Object.entries(src.archived as Record<string, unknown>)) {
      if (RETIRED_IDS.includes(id) && !SESSION_BY_ID[id]) archived[id] = clean(id, e)
    }
  }
  for (const [id, e] of Object.entries(src.entries as Record<string, unknown>)) {
    const s = SESSION_BY_ID[id]
    if (!s) {
      // A session the plan no longer has: keep her entry in the archive instead of dropping it.
      if (RETIRED_IDS.includes(id)) archived[id] = clean(id, e)
      continue // ignore anything else unknown
    }
    const entry = clean(id, e)
    if (isSwimEligible(s)) {
      // Swim Saturday: 'swim' or 'walk' as she logged it; absent = a walk saved under the old plan.
    } else if (entry.activity === 'swim' && LEGACY_SWIM_IDS.includes(id)) {
      // A swim saved on an old swim-or-walk Saturday stays a swim, as she logged it. New ones cannot be made here.
    } else {
      delete entry.activity
    }
    // A walk ticked under the old plan without a typed distance counted the old planned km. Keep that number so her
    // totals do not change now that the Saturday's planned km is different. (The app always stores actualKm now.)
    const legacyKm = s.type !== 'event' && id.endsWith('-sat') ? LEGACY_SAT_KM[s.week] : undefined
    if (entry.completed && entry.activity === undefined && entry.actualKm === undefined && legacyKm !== undefined && legacyKm !== s.plannedKm) {
      entry.actualKm = legacyKm
    }
    entries[id] = entry
  }
  const weekNotes: Record<string, string> = {}
  if (src.weekNotes && typeof src.weekNotes === 'object') {
    for (const [k, v] of Object.entries(src.weekNotes as Record<string, unknown>)) {
      const n = Number(k)
      if (Number.isInteger(n) && n >= 1 && n <= TOTAL_WEEKS && typeof v === 'string') weekNotes[k] = v.slice(0, 5000)
    }
  }
  return {
    version: 1,
    displayName: str(src.displayName, 60) ?? '',
    entries,
    weekNotes,
    seenMilestones: Array.isArray(src.seenMilestones) ? src.seenMilestones.filter((m): m is string => typeof m === 'string') : [],
    updatedAt: str(src.updatedAt, 40),
    ...(Object.keys(archived).length ? { archived } : {}),
  }
}

export function loadData(): { data: AppData; error?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { data: emptyData() }
    return { data: validateData(JSON.parse(raw)) }
  } catch (e) {
    // Keep a copy of anything unreadable so it is never silently lost.
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) localStorage.setItem(`${STORAGE_KEY}-corrupt-${Date.now()}`, raw)
    } catch { /* ignore */ }
    return { data: emptyData(), error: `Saved data could not be read (${(e as Error).message}). A backup copy was kept.` }
  }
}

export function saveData(data: AppData): string | undefined {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return undefined
  } catch {
    return 'Could not save to this device. Private browsing or full storage can cause this. Export a backup in Settings.'
  }
}

export function exportPayload(data: AppData): string {
  return JSON.stringify({ app: 'my-mammutmarsch-diary', exportedAt: new Date().toISOString(), data }, null, 2)
}
