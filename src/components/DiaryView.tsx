import { ChevronLeft, ChevronRight, Leaf, NotebookPen, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { addDays, formatRange, parseISO } from '../lib/dates'
import { TOTAL_WEEKS, WEEKS, weekForDate } from '../lib/plan'
import { effectiveDate, formatKm, isDone, sortedSessions } from '../lib/stats'
import type { Diary } from '../lib/useDiary'
import { Card, SessionRow } from './ui'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function DiaryView({ diary, today, onOpen, onPrint }: { diary: Diary; today: string; onOpen: (id: string) => void; onPrint: () => void }) {
  const { data } = diary
  const currentWeek = weekForDate(today)
  const [week, setWeek] = useState(currentWeek)
  const w = WEEKS[week - 1]
  const [note, setNote] = useState(data.weekNotes[String(week)] ?? '')
  useEffect(() => { setNote(data.weekNotes[String(week)] ?? '') }, [week]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sessions belong to their original week; a rescheduled walk still shows here with its new date.
  const sessions = sortedSessions(data).filter((s) => s.week === week)
  const planned = w.sessions.filter((s) => !s.isEvent).reduce((a, s) => a + s.plannedKm, 0)
  const doneCount = w.sessions.filter((s) => !s.isEvent && isDone(s, data)).length
  const trainingCount = w.sessions.filter((s) => !s.isEvent).length
  const days = Array.from({ length: 7 }, (_, i) => addDays(w.start, i))
  const sessionDates = new Map(sessions.map((s) => [effectiveDate(s, data), s]))

  return (
    <div className="pt-safe px-4">
      <div className="flex items-center justify-between pt-6">
        <h1 className="text-[1.7rem] font-extrabold text-forest">Training diary</h1>
        <button type="button" onClick={onPrint} className="flex h-11 w-11 items-center justify-center rounded-full text-forest ring-1 ring-forest/15" aria-label="Print the full training schedule">
          <Printer size={20} />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" disabled={week <= 1} onClick={() => setWeek(week - 1)} aria-label="Previous week"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-forest shadow-soft disabled:opacity-30">
          <ChevronLeft size={24} />
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Go to week</span>
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))}
            className="h-12 w-full appearance-none rounded-2xl bg-white px-3 text-center font-bold text-forest shadow-soft">
            {WEEKS.map((x) => (
              <option key={x.number} value={x.number}>
                Week {x.number} · {formatRange(x.start, x.end).replace(/ \d{4}$/, '')}{x.recovery ? ' 🌿' : ''}
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={week >= TOTAL_WEEKS} onClick={() => setWeek(week + 1)} aria-label="Next week"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-forest shadow-soft disabled:opacity-30">
          <ChevronRight size={24} />
        </button>
      </div>
      {week !== currentWeek && (
        <div className="mt-2 text-center">
          <button type="button" onClick={() => setWeek(currentWeek)} className="min-h-[40px] px-3 text-sm font-semibold text-leaf">Back to this week</button>
        </div>
      )}

      <Card className={`mt-4 p-4 ${w.recovery ? 'bg-[#EEF6F0] ring-1 ring-leaf/30' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-extrabold text-forest">Week {week} of {TOTAL_WEEKS}</p>
            <p className="text-sm text-ink/70">{formatRange(w.start, w.end)}{parseISO(w.start).y === parseISO(w.end).y ? ` ${parseISO(w.end).y}` : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-forest">{doneCount}/{trainingCount}</p>
            <p className="text-xs text-ink/60">{formatKm(planned)} km planned</p>
          </div>
        </div>
        {w.recovery && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-sage px-3 py-2 text-sm font-semibold text-forest">
            <Leaf size={16} /> {week >= 17 ? 'Taper week: ease off and let your legs freshen up.' : 'Recovery week: lighter walks so your body can adapt.'}
          </p>
        )}
        {week === TOTAL_WEEKS && (
          <p className="mt-3 rounded-xl bg-lime/60 px-3 py-2 text-sm font-semibold text-forest">Race week! Two short walks, then the Mammutmarsch on Saturday.</p>
        )}
        <div className="mt-4 grid grid-cols-7 gap-1" aria-label="Week calendar">
          {days.map((d, i) => {
            const s = sessionDates.get(d)
            const isToday = d === today
            const done = s && isDone(s, data)
            const missed = s && !done && d < today
            return (
              <div key={d} className={`flex flex-col items-center rounded-xl py-1.5 ${isToday ? 'bg-forest text-white' : ''}`} aria-current={isToday ? 'date' : undefined}>
                <span className={`text-[0.7rem] font-semibold ${isToday ? 'text-white/80' : 'text-ink/50'}`}>{DOW[i]}</span>
                <span className="text-sm font-bold">{parseISO(d).day}</span>
                <span className={`mt-1 h-2 w-2 rounded-full ${!s ? 'bg-transparent' : s.isEvent ? 'bg-lime ring-1 ring-forest' : done ? 'bg-leaf' : missed ? 'bg-amber-line' : isToday ? 'bg-lime' : 'border border-ink/30'}`} />
              </div>
            )
          })}
        </div>
      </Card>

      <div className="mt-4 flex flex-col gap-3">
        {sessions.map((s) => (
          <SessionRow key={s.id} session={s} data={data} today={today} onToggle={() => diary.toggle(s.id)} onOpen={() => onOpen(s.id)} />
        ))}
      </div>

      <Card className="mt-6 p-4">
        <label htmlFor="weeknote" className="flex items-center gap-2 font-bold text-forest"><NotebookPen size={18} /> Notes for this week</label>
        <textarea id="weeknote" rows={3} value={note} placeholder="How did this week feel? Anything to remember?"
          onChange={(e) => setNote(e.target.value)} onBlur={() => diary.setWeekNote(week, note)}
          className="mt-2 w-full rounded-xl border border-ink/15 bg-paper p-3 text-ink placeholder:text-ink/40" />
        {note !== (data.weekNotes[String(week)] ?? '') && (
          <button type="button" onClick={() => diary.setWeekNote(week, note)} className="mt-2 min-h-[44px] rounded-xl bg-forest px-4 text-sm font-semibold text-white">Save note</button>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-ink/70">
        <Legend dot="bg-leaf" label="Completed" />
        <Legend dot="border border-ink/40" label="Upcoming" />
        <Legend dot="bg-amber-line" label="Not ticked off" />
        <Legend dot="bg-lime ring-1 ring-forest" label="Mammutmarsch" />
      </div>
    </div>
  )
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${dot}`} />{label}</span>
}
