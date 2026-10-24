import { CalendarClock, CheckCircle2, Footprints, Undo2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatLong, isValidISO } from '../lib/dates'
import { SESSION_BY_ID, TYPE_HINT, TYPE_LABEL } from '../lib/plan'
import { effectiveDate, formatKm, statusOf } from '../lib/stats'
import type { Difficulty } from '../lib/storage'
import type { Diary } from '../lib/useDiary'
import { StatusPill } from './ui'

export function WalkSheet({ id, diary, today, onClose }: { id: string; diary: Diary; today: string; onClose: () => void }) {
  const s = SESSION_BY_ID[id]
  const e = diary.data.entries[id]
  const status = statusOf(s, diary.data, today)
  const done = status === 'completed'
  const [km, setKm] = useState(e?.actualKm !== undefined ? String(e.actualKm) : '')
  const [hours, setHours] = useState(e?.durationMin ? String(Math.floor(e.durationMin / 60)) : '')
  const [mins, setMins] = useState(e?.durationMin ? String(e.durationMin % 60) : '')
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>(e?.difficulty)
  const [notes, setNotes] = useState(e?.notes ?? '')
  const [feet, setFeet] = useState(e?.footIssues ?? '')
  const [date, setDate] = useState(effectiveDate(s, diary.data))
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  // Keep the distance field in sync when completion sets the default actual distance.
  useEffect(() => { if (done && km === '' && e?.actualKm !== undefined) setKm(String(e.actualKm)) }, [done, e?.actualKm]) // eslint-disable-line react-hooks/exhaustive-deps

  const parse = (): { ok: true; patch: Parameters<Diary['setEntry']>[1] } | { ok: false; msg: string } => {
    const kmVal = km.trim() === '' ? undefined : Number(km.replace(',', '.'))
    if (kmVal !== undefined && (!Number.isFinite(kmVal) || kmVal < 0 || kmVal > 200)) return { ok: false, msg: 'Please enter a distance between 0 and 200 km.' }
    const h = hours.trim() === '' ? 0 : Number(hours)
    const m = mins.trim() === '' ? 0 : Number(mins)
    if (!Number.isInteger(h) || h < 0 || h > 48) return { ok: false, msg: 'Hours should be a whole number between 0 and 48.' }
    if (!Number.isInteger(m) || m < 0 || m > 59) return { ok: false, msg: 'Minutes should be a whole number between 0 and 59.' }
    if (!isValidISO(date)) return { ok: false, msg: 'Please pick a valid date.' }
    const durationMin = h * 60 + m
    return {
      ok: true,
      patch: {
        actualKm: kmVal === undefined ? undefined : Math.round(kmVal * 100) / 100,
        durationMin: durationMin || undefined,
        difficulty,
        notes: notes.trim() ? notes : undefined,
        footIssues: feet.trim() ? feet : undefined,
        rescheduledDate: date !== s.date ? date : undefined,
      },
    }
  }

  const save = (thenComplete = false) => {
    const r = parse()
    if (!r.ok) { setErr(r.msg); return }
    setErr(null)
    diary.setEntry(id, r.patch)
    if (thenComplete) {
      diary.complete(id)
      if (km.trim() === '') setKm(String(s.plannedKm))
    }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  return (
    <div className="anim-fade fixed inset-0 z-40 flex items-end justify-center bg-ink/50" onClick={onClose}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sheet-title"
        className="anim-sheet pb-safe max-h-[92vh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-t-[2rem] bg-paper outline-none"
        onClick={(ev) => ev.stopPropagation()}>
        <div className={`sticky top-0 z-10 rounded-t-[2rem] px-5 pb-4 pt-3 ${s.isEvent ? 'bg-forest text-white' : 'bg-paper'}`}>
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/20" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${s.isEvent ? 'text-lime' : 'text-leaf'}`}>{formatLong(effectiveDate(s, diary.data), true)} · Week {s.week}</p>
              <h2 id="sheet-title" className={`text-2xl font-extrabold leading-tight ${s.isEvent ? 'text-white' : 'text-forest'}`}>{TYPE_LABEL[s.type]}</h2>
              <p className={`mt-1 text-sm ${s.isEvent ? 'text-white/80' : 'text-ink/70'}`}>Planned: <strong>{formatKm(s.plannedKm)} km</strong></p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${s.isEvent ? 'bg-white/10 text-white' : 'bg-white text-forest shadow-soft'}`}>
              <X size={22} />
            </button>
          </div>
          <div className="mt-2"><StatusPill status={status} isEvent={s.isEvent} /></div>
        </div>

        <div className="px-5 pb-8">
          <p className="mt-2 flex gap-2 text-sm text-ink/70"><Footprints size={16} className="mt-0.5 shrink-0" />{TYPE_HINT[s.type]}</p>

          {done ? (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sage p-4">
              <CheckCircle2 className="anim-pop shrink-0 text-leaf" size={32} />
              <p className="flex-1 font-semibold text-forest">Completed. Nice work!</p>
              <button type="button" onClick={() => diary.uncomplete(id)} className="flex min-h-[44px] items-center gap-1 rounded-xl bg-white px-3 text-sm font-semibold text-forest">
                <Undo2 size={16} /> Undo
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => save(true)} className="mt-4 flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl bg-leaf text-lg font-bold text-white shadow-soft">
              <CheckCircle2 size={24} /> Mark Complete
            </button>
          )}

          <div className="mt-6 space-y-5">
            <Field label="Actual distance (km)" htmlFor="km">
              <input id="km" inputMode="decimal" value={km} placeholder={done ? String(s.plannedKm) : `e.g. ${s.plannedKm}`} onChange={(ev) => setKm(ev.target.value)}
                className="h-12 w-full rounded-xl border border-ink/15 bg-white px-3" />
              {!done && <p className="mt-1 text-xs text-ink/60">Leave empty to use the planned {formatKm(s.plannedKm)} km when you mark it complete.</p>}
            </Field>

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-forest">Duration</span>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2"><input inputMode="numeric" aria-label="Hours" value={hours} onChange={(ev) => setHours(ev.target.value)} placeholder="0" className="h-12 w-full min-w-0 rounded-xl border border-ink/15 bg-white px-3" /><span className="text-sm text-ink/70">h</span></label>
                <label className="flex items-center gap-2"><input inputMode="numeric" aria-label="Minutes" value={mins} onChange={(ev) => setMins(ev.target.value)} placeholder="0" className="h-12 w-full min-w-0 rounded-xl border border-ink/15 bg-white px-3" /><span className="text-sm text-ink/70">min</span></label>
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-forest" id="diff-label">How did it feel?</span>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="diff-label">
                {(['easy', 'moderate', 'hard'] as Difficulty[]).map((d) => (
                  <button key={d} type="button" role="radio" aria-checked={difficulty === d} onClick={() => setDifficulty(difficulty === d ? undefined : d)}
                    className={`min-h-[48px] rounded-xl text-sm font-semibold capitalize ${difficulty === d ? 'bg-forest text-white' : 'bg-white text-forest ring-1 ring-ink/15'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Notes" htmlFor="notes">
              <textarea id="notes" rows={3} value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="Route, weather, how you felt…"
                className="w-full rounded-xl border border-ink/15 bg-white p-3" />
            </Field>

            <Field label="Feet: any discomfort or blisters?" htmlFor="feet">
              <input id="feet" value={feet} onChange={(ev) => setFeet(ev.target.value)} placeholder="e.g. small blister left heel"
                className="h-12 w-full rounded-xl border border-ink/15 bg-white px-3" />
            </Field>

            <Field label="Walk date" htmlFor="date" icon={<CalendarClock size={16} />}>
              <input id="date" type="date" value={date} onChange={(ev) => setDate(ev.target.value)}
                className="h-12 w-full min-w-0 max-w-full rounded-xl border border-ink/15 bg-white px-3" style={{ WebkitAppearance: 'none' }} />
              <p className="mt-1 text-xs text-ink/60">
                Need to move this walk? Pick a new day.{date !== s.date && <> Originally {formatLong(s.date)}. <button type="button" className="font-semibold text-leaf underline" onClick={() => setDate(s.date)}>Reset</button></>}
              </p>
            </Field>
          </div>

          {err && <p role="alert" className="mt-4 rounded-xl bg-amber-soft p-3 text-sm font-medium text-amber-ink">{err}</p>}

          <button type="button" onClick={() => save(false)} className="mt-6 min-h-[56px] w-full rounded-2xl bg-forest text-lg font-bold text-white">
            {saved ? 'Saved ✓' : 'Save details'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, htmlFor, children, icon }: { label: string; htmlFor: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-forest">{icon}{label}</label>
      {children}
    </div>
  )
}
