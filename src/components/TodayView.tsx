import { AlertCircle, CalendarDays, CheckCircle2, ChevronRight, Footprints, Mountain, PencilLine, Sparkles, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { daysBetween, formatLong } from '../lib/dates'
import { EVENT_DATE, TRAINING_START, TYPE_HINT, TYPE_LABEL, SESSION_BY_ID } from '../lib/plan'
import { computeStats, effectiveDate, formatKm, kmFor, missedSessions, sortedSessions, statusOf, upcomingSessions } from '../lib/stats'
import type { Diary } from '../lib/useDiary'
import { Card, SectionTitle, SessionRow, StatusPill } from './ui'

const MESSAGES = [
  'Every kilometre counts!',
  'You’re building your endurance.',
  'Another walk closer to 42 km!',
  'Consistency beats speed.',
  'Your Mammutmarsch adventure is getting closer.',
]

export function TodayView({ diary, today, onOpen, onGoDiary }: { diary: Diary; today: string; onOpen: (id: string) => void; onGoDiary: () => void }) {
  const { data } = diary
  const stats = computeStats(data, today)
  const [justDone, setJustDone] = useState<string | null>(null)

  // Focus: a walk completed in this visit stays visible as confirmation; otherwise today's walk; otherwise the next one.
  const focus = useMemo(() => {
    if (justDone && SESSION_BY_ID[justDone]) return SESSION_BY_ID[justDone]
    const todays = sortedSessions(data).find((s) => effectiveDate(s, data) === today)
    if (todays) return todays
    return upcomingSessions(data, today)[0] ?? null
  }, [data, today, justDone])

  const upcoming = upcomingSessions(data, today).filter((s) => s.id !== focus?.id).slice(0, 3)
  const missed = missedSessions(data, today)
  const message = MESSAGES[(daysBetween('2026-01-01', today) % MESSAGES.length + MESSAGES.length) % MESSAGES.length]
  const name = data.displayName.trim()
  const beforeStart = today < TRAINING_START
  const daysToStart = daysBetween(today, TRAINING_START)

  return (
    <div>
      <header className="pt-safe relative overflow-hidden rounded-b-[2rem] bg-forest px-5 pb-7 text-white">
        <svg aria-hidden className="pointer-events-none absolute -bottom-2 right-0 h-28 w-64 opacity-20" viewBox="0 0 260 110">
          <path d="M0 110 L70 30 L105 70 L150 15 L260 110 Z" fill="#C4EAA4" />
        </svg>
        <div className="relative pt-6">
          {name && <p className="text-sm font-medium text-lime">Hi {name}!</p>}
          <h1 className="text-[1.7rem] font-extrabold leading-tight">My Mammutmarsch Diary</h1>
          <p className="mt-1 text-[0.95rem] text-white/80">42 km · Leipzig · 6 March 2027</p>
          <div className="mt-5 flex items-end gap-3">
            {stats.daysToEvent > 0 ? (
              <>
                <span className="text-5xl font-extrabold leading-none text-lime">{stats.daysToEvent}</span>
                <span className="pb-1 text-base font-medium text-white/90">{stats.daysToEvent === 1 ? 'day' : 'days'} until<br />the Mammutmarsch</span>
              </>
            ) : today === EVENT_DATE ? (
              <span className="text-3xl font-extrabold text-lime">It’s Mammutmarsch day!</span>
            ) : (
              <span className="text-2xl font-extrabold text-lime">{stats.eventDone ? 'You did it. 42 km!' : 'The Mammutmarsch has been!'}</span>
            )}
          </div>
        </div>
      </header>

      <div className="px-4">
        <Card className="mt-4 p-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat value={`${stats.completed}`} suffix={`/${stats.total}`} label="walks done" />
            <Stat value={formatKm(stats.totalKm)} suffix="km" label="walked" />
            <Stat value={`${stats.percent}`} suffix="%" label="complete" />
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-sage" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.percent} aria-label="Training walks completed">
            <div className="h-full rounded-full bg-gradient-to-r from-leaf to-lime transition-all" style={{ width: `${Math.max(stats.percent, stats.completed ? 3 : 0)}%` }} />
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-leaf">
            <Sparkles size={16} /> {beforeStart ? `Training starts in ${daysToStart} ${daysToStart === 1 ? 'day' : 'days'}. You’ve got this!` : today === EVENT_DATE ? 'Enjoy every step today. You are ready!' : today > EVENT_DATE ? 'What an adventure. Be proud of every kilometre!' : message}
          </p>
        </Card>

        {focus ? (
          <FocusCard key={focus.id} diary={diary} today={today} id={focus.id} justDone={justDone === focus.id}
            onComplete={() => { diary.complete(focus.id); setJustDone(focus.id) }}
            onUndo={() => { diary.uncomplete(focus.id); setJustDone(null) }}
            onNext={() => setJustDone(null)}
            onOpen={() => onOpen(focus.id)} />
        ) : (
          <Card className="mt-6 p-6 text-center">
            <Mountain className="mx-auto text-leaf" size={36} />
            <p className="mt-2 text-lg font-bold text-forest">All walks done. What a journey!</p>
          </Card>
        )}

        {missed.length > 0 && (
          <button type="button" onClick={onGoDiary} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-amber-soft p-4 text-left ring-1 ring-amber-line">
            <AlertCircle className="shrink-0 text-amber-ink" size={22} />
            <span className="flex-1 text-sm text-amber-ink">
              <strong>{missed.length} earlier {missed.length === 1 ? 'walk is' : 'walks are'} not ticked off.</strong> Did one anyway? Tick it in your diary. Missed one? No problem, just carry on.
            </span>
            <ChevronRight className="shrink-0 text-amber-ink" size={20} />
          </button>
        )}

        {upcoming.length > 0 && (
          <>
            <SectionTitle right={<button type="button" onClick={onGoDiary} className="flex min-h-[44px] items-center gap-1 text-sm font-semibold text-leaf">Full diary <ChevronRight size={16} /></button>}>
              Coming up
            </SectionTitle>
            <div className="flex flex-col gap-3">
              {upcoming.map((s) => (
                <SessionRow key={s.id} session={s} data={data} today={today} onToggle={() => diary.toggle(s.id)} onOpen={() => onOpen(s.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ value, suffix, label }: { value: string; suffix: string; label: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[1.65rem] font-extrabold leading-none text-forest">
        {value}<span className="text-base font-bold text-forest/60">{suffix}</span>
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-ink/60">{label}</div>
    </div>
  )
}

function FocusCard({ diary, today, id, justDone, onComplete, onUndo, onNext, onOpen }: {
  diary: Diary; today: string; id: string; justDone: boolean; onComplete: () => void; onUndo: () => void; onNext: () => void; onOpen: () => void
}) {
  const { data } = diary
  const s = SESSION_BY_ID[id]
  const status = statusOf(s, data, today)
  const date = effectiveDate(s, data)
  const e = data.entries[id]
  const isToday = date === today
  const heading = status === 'completed' ? (isToday ? 'Today’s walk' : 'Walk complete') : isToday ? 'Today’s walk' : 'Next scheduled walk'

  if (status === 'completed') {
    return (
      <>
        <SectionTitle>{heading}</SectionTitle>
        <Card className="overflow-hidden">
          <div className="bg-sage p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="anim-pop shrink-0 text-leaf" size={44} strokeWidth={2.25} />
              <div>
                <p className="text-xl font-extrabold text-forest">Well done!</p>
                <p className="text-sm text-forest/80">{TYPE_LABEL[s.type]} · {formatKm(kmFor(s, e))} km ticked off</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            <button type="button" onClick={onOpen} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-forest px-3 font-semibold text-white">
              <PencilLine size={18} /> Add details
            </button>
            <button type="button" onClick={onUndo} className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-3 font-semibold text-forest ring-1 ring-forest/20">
              <Undo2 size={18} /> Undo
            </button>
            {justDone && (
              <button type="button" onClick={onNext} className="col-span-2 flex min-h-[48px] items-center justify-center gap-1 text-sm font-semibold text-leaf">
                Show my next walk <ChevronRight size={16} />
              </button>
            )}
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <SectionTitle>{heading}</SectionTitle>
      <Card className={`overflow-hidden ${s.isEvent ? 'ring-2 ring-lime' : ''}`}>
        <button type="button" onClick={onOpen} className={`block w-full p-5 text-left ${s.isEvent ? 'bg-forest text-white' : ''}`}>
          <div className={`flex items-center gap-2 text-sm font-semibold ${s.isEvent ? 'text-lime' : 'text-leaf'}`}>
            <CalendarDays size={16} /> {formatLong(date)}{isToday ? ' · Today' : ''}
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-2xl font-extrabold leading-tight ${s.isEvent ? 'text-white' : 'text-forest'}`}>{TYPE_LABEL[s.type]}</p>
              <div className="mt-2"><StatusPill status={status} isEvent={s.isEvent} /></div>
            </div>
            <div className="shrink-0 text-right">
              <span className={`text-5xl font-extrabold leading-none ${s.isEvent ? 'text-lime' : 'text-forest'}`}>{formatKm(s.plannedKm)}</span>
              <span className={`ml-1 text-lg font-bold ${s.isEvent ? 'text-lime' : 'text-forest/70'}`}>km</span>
            </div>
          </div>
          <p className={`mt-3 flex gap-2 text-sm ${s.isEvent ? 'text-white/80' : 'text-ink/70'}`}><Footprints size={16} className="mt-0.5 shrink-0" />{TYPE_HINT[s.type]}</p>
        </button>
        <div className="p-4 pt-0">
          <button type="button" onClick={onComplete} className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl bg-leaf px-4 text-lg font-bold text-white shadow-soft active:scale-[0.99]">
            <CheckCircle2 size={24} /> Mark Complete
          </button>
        </div>
      </Card>
    </>
  )
}
