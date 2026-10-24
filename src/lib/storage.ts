import { isValidISO } from './dates'
import { SESSION_BY_ID } from './plan'

export type Difficulty = 'easy' | 'moderate' | 'hard'

export interface Entry {
  completed: boolean
  completedAt?: string
  actualKm?: number
  durationMin?: number
  difficulty?: Difficulty
  notes?: string
  footIssues?: string
  rescheduledDate?: string
}

export interface AppData {
  version: 1
  displayName: string
  entries: Record<string, Entry>
  weekNotes: Record<string, string>
  seenMilestones: string[]
  updatedAt?: string
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
  for (const [id, e] of Object.entries(src.entries as Record<string, unknown>)) {
    if (!SESSION_BY_ID[id]) continue // ignore unknown sessions
    if (!e || typeof e !== 'object') throw new Error(`Entry "${id}" is not valid.`)
    const x = e as Record<string, unknown>
    if (typeof x.completed !== 'boolean') throw new Error(`Entry "${id}" is missing its completed flag.`)
    const diff = x.difficulty
    entries[id] = {
      completed: x.completed,
      completedAt: str(x.completedAt, 40),
      actualKm: num(x.actualKm, 200),
      durationMin: num(x.durationMin, 60 * 48),
      difficulty: diff === 'easy' || diff === 'moderate' || diff === 'hard' ? diff : undefined,
      notes: str(x.notes),
      footIssues: str(x.footIssues),
      rescheduledDate: isValidISO(x.rescheduledDate) ? x.rescheduledDate : undefined,
    }
  }
  const weekNotes: Record<string, string> = {}
  if (src.weekNotes && typeof src.weekNotes === 'object') {
    for (const [k, v] of Object.entries(src.weekNotes as Record<string, unknown>)) {
      const n = Number(k)
      if (Number.isInteger(n) && n >= 1 && n <= 19 && typeof v === 'string') weekNotes[k] = v.slice(0, 5000)
    }
  }
  return {
    version: 1,
    displayName: str(src.displayName, 60) ?? '',
    entries,
    weekNotes,
    seenMilestones: Array.isArray(src.seenMilestones) ? src.seenMilestones.filter((m): m is string => typeof m === 'string') : [],
    updatedAt: str(src.updatedAt, 40),
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
