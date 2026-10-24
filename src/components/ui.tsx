import { Check, Flag, Mountain } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatShort } from '../lib/dates'
import { TYPE_LABEL, type Session } from '../lib/plan'
import { effectiveDate, formatKm, kmFor, statusOf, type Status } from '../lib/stats'
import type { AppData } from '../lib/storage'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-white shadow-soft ${className}`}>{children}</div>
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between px-1">
      <h2 className="text-lg font-bold text-forest">{children}</h2>
      {right}
    </div>
  )
}

export const STATUS_TEXT: Record<Status, string> = {
  completed: 'Completed',
  upcoming: 'Upcoming',
  today: 'Today',
  missed: 'Not ticked off yet',
}

/** Round check button: one tap toggles completion. */
export function CheckButton({ session, status, onToggle, size = 'md' }: { session: Session; status: Status; onToggle: () => void; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-12 w-12' : 'h-11 w-11'
  const done = status === 'completed'
  const base = 'flex shrink-0 items-center justify-center rounded-full border-2 transition-colors'
  const cls = done
    ? 'border-leaf bg-leaf text-white'
    : status === 'missed'
      ? 'border-amber-line bg-amber-soft text-amber-ink'
      : session.isEvent
        ? 'border-forest bg-lime/40 text-forest'
        : status === 'today'
          ? 'border-forest bg-sage text-forest'
          : 'border-ink/25 bg-white text-ink/30'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`${done ? 'Completed' : 'Mark complete'}: ${TYPE_LABEL[session.type]}, ${formatKm(session.plannedKm)} km`}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className={`${base} ${dim} ${cls}`}
    >
      {done ? <Check className="anim-pop" size={24} strokeWidth={3} /> : session.isEvent ? <Flag size={20} /> : <Check size={20} strokeWidth={2.5} className="opacity-60" />}
    </button>
  )
}

export function StatusPill({ status, isEvent }: { status: Status; isEvent?: boolean }) {
  const map: Record<Status, string> = {
    completed: 'bg-sage text-forest',
    upcoming: 'bg-paper text-ink/70 ring-1 ring-ink/15',
    today: 'bg-forest text-white',
    missed: 'bg-amber-soft text-amber-ink ring-1 ring-amber-line',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status]}`}>
      {status === 'completed' && <Check size={12} strokeWidth={3} />}
      {isEvent && status !== 'completed' ? (status === 'today' ? 'Race day!' : 'Event day') : STATUS_TEXT[status]}
    </span>
  )
}

/** Session card used across Today and Diary. */
export function SessionRow({ session, data, today, onToggle, onOpen, showDate = true }: {
  session: Session; data: AppData; today: string; onToggle: () => void; onOpen: () => void; showDate?: boolean
}) {
  const status = statusOf(session, data, today)
  const entry = data.entries[session.id]
  const date = effectiveDate(session, data)
  const moved = entry?.rescheduledDate && entry.rescheduledDate !== session.date
  const ring = session.isEvent
    ? 'bg-gradient-to-br from-forest to-[#245448] text-white'
    : status === 'completed'
      ? 'bg-white ring-1 ring-leaf/30'
      : status === 'missed'
        ? 'bg-white ring-1 ring-amber-line/70'
        : status === 'today'
          ? 'bg-white ring-2 ring-forest'
          : 'bg-white ring-1 ring-ink/10'
  const sub = session.isEvent ? 'text-white/80' : 'text-ink/60'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className={`flex min-h-[72px] w-full cursor-pointer items-center gap-3 rounded-2xl p-3 pr-4 text-left shadow-soft ${ring}`}
      aria-label={`${TYPE_LABEL[session.type]} on ${formatShort(date)}, open details`}
    >
      <CheckButton session={session} status={status} onToggle={onToggle} />
      <div className="min-w-0 flex-1">
        {showDate && (
          <div className={`text-xs font-semibold uppercase tracking-wide ${sub}`}>
            {formatShort(date)}{moved ? ' · moved' : ''}
          </div>
        )}
        <div className={`truncate text-base font-semibold ${session.isEvent ? 'text-white' : status === 'completed' ? 'text-forest' : 'text-ink'}`}>
          {session.isEvent && <Mountain size={16} className="mr-1 inline -mt-0.5" />}
          {TYPE_LABEL[session.type]}
        </div>
        <div className="mt-1">
          {session.isEvent && status !== 'completed' ? (
            <span className="inline-flex rounded-full bg-lime px-2.5 py-0.5 text-xs font-bold text-forest">Event day</span>
          ) : (
            <StatusPill status={status} />
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`text-xl font-bold ${session.isEvent ? 'text-lime' : 'text-forest'}`}>
          {formatKm(status === 'completed' ? kmFor(session, entry) : session.plannedKm)}
          <span className="ml-0.5 text-sm font-semibold">km</span>
        </div>
        {status === 'completed' && entry?.actualKm !== undefined && entry.actualKm !== session.plannedKm && (
          <div className={`text-xs ${sub}`}>plan {formatKm(session.plannedKm)}</div>
        )}
      </div>
    </div>
  )
}
