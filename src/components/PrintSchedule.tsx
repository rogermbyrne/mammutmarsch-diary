import { formatRange, formatShort } from '../lib/dates'
import { TYPE_LABEL, WEEKS } from '../lib/plan'
import type { AppData } from '../lib/storage'
import { effectiveDate, formatKm, isDone, kmFor } from '../lib/stats'

/** Hidden on screen; shown only when printing. */
export function PrintSchedule({ data }: { data: AppData }) {
  return (
    <div className="hidden print:block print:p-6 print:text-black">
      <h1 className="text-2xl font-bold">My Mammutmarsch Diary: training plan</h1>
      <p className="mb-4">42 km · Leipzig · 6 March 2027</p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left"><th className="py-1">Week</th><th>Dates</th><th>Walks</th></tr>
        </thead>
        <tbody>
          {WEEKS.map((w) => (
            <tr key={w.number} className="border-b border-gray-300 align-top">
              <td className="py-1 pr-2 font-semibold">{w.number}{w.recovery ? ' (recovery)' : ''}</td>
              <td className="pr-2">{formatRange(w.start, w.end)}</td>
              <td>
                {w.sessions.map((s) => (
                  <div key={s.id}>{isDone(s, data) ? '☑' : '☐'} {formatShort(effectiveDate(s, data))}: {TYPE_LABEL[s.type]} {formatKm(s.plannedKm)} km{isDone(s, data) && kmFor(s, data.entries[s.id]) !== s.plannedKm ? ` (walked ${formatKm(kmFor(s, data.entries[s.id]))} km)` : ''}</div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
