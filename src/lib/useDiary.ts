import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyData, loadData, saveData, type AppData, type Entry } from './storage'
import { SESSION_BY_ID } from './plan'
import { todayBerlin } from './dates'

export function useDiary() {
  const initial = useRef(loadData())
  const [data, setData] = useState<AppData>(initial.current.data)
  const [error, setError] = useState<string | undefined>(initial.current.error)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const err = saveData(data)
    setError(err)
  }, [data])

  useEffect(() => {
    // Ask the browser to keep our storage (helps on iOS / Android).
    try { navigator.storage?.persist?.().catch(() => undefined) } catch { /* ignore */ }
  }, [])

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((d) => ({ ...fn(d), updatedAt: new Date().toISOString() }))
  }, [])

  const setEntry = useCallback((id: string, patch: Partial<Entry>) => {
    update((d) => {
      const prev: Entry = d.entries[id] ?? { completed: false }
      return { ...d, entries: { ...d.entries, [id]: { ...prev, ...patch } } }
    })
  }, [update])

  const complete = useCallback((id: string) => {
    update((d) => {
      const prev: Entry = d.entries[id] ?? { completed: false }
      const s = SESSION_BY_ID[id]
      return {
        ...d,
        entries: {
          ...d.entries,
          [id]: { ...prev, completed: true, completedAt: new Date().toISOString(), actualKm: prev.actualKm ?? s.plannedKm },
        },
      }
    })
  }, [update])

  const uncomplete = useCallback((id: string) => {
    update((d) => {
      const prev = d.entries[id]
      if (!prev) return d
      return { ...d, entries: { ...d.entries, [id]: { ...prev, completed: false, completedAt: undefined } } }
    })
  }, [update])

  const toggle = useCallback((id: string) => {
    if (data.entries[id]?.completed) uncomplete(id)
    else complete(id)
  }, [data, complete, uncomplete])

  const setName = useCallback((displayName: string) => update((d) => ({ ...d, displayName: displayName.slice(0, 60) })), [update])
  const setWeekNote = useCallback((week: number, text: string) =>
    update((d) => ({ ...d, weekNotes: { ...d.weekNotes, [String(week)]: text } })), [update])
  const markSeen = useCallback((ids: string[]) =>
    update((d) => ({ ...d, seenMilestones: Array.from(new Set([...d.seenMilestones, ...ids])) })), [update])
  const replaceAll = useCallback((next: AppData) => setData({ ...next }), [])
  const reset = useCallback(() => setData(emptyData()), [])

  return { data, error, setError, setEntry, complete, uncomplete, toggle, setName, setWeekNote, markSeen, replaceAll, reset }
}

export type Diary = ReturnType<typeof useDiary>

/** Today's Berlin date, refreshed when the app comes back to the foreground or at midnight. */
export function useToday(): string {
  const [today, setToday] = useState(todayBerlin())
  useEffect(() => {
    const refresh = () => setToday(todayBerlin())
    const id = window.setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh) }
  }, [])
  return today
}
