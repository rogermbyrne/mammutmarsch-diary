import { Award, Clock, Flame, Footprints, Lock, Mountain, Route, Timer, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EVENT_KM } from '../lib/plan'
import { computeStats, formatDuration, formatKm, longWalkChart, longWalkPace, milestones, weeklyChart } from '../lib/stats'
import type { Diary } from '../lib/useDiary'
import { Card, SectionTitle } from './ui'

const axis = { fontSize: 11, fill: '#24332C' }

export function ProgressView({ diary, today }: { diary: Diary; today: string }) {
  const { data } = diary
  const st = computeStats(data, today)
  const weekly = weeklyChart(data)
  const longs = longWalkChart(data)
  const ms = milestones(data)
  const pace = longWalkPace(data)
  const unlocked = ms.filter((m) => m.unlocked).length

  return (
    <div className="pt-safe px-4">
      <h1 className="pt-6 text-[1.7rem] font-extrabold text-forest">Your progress</h1>
      <p className="mt-1 text-ink/70">{st.completed === 0 ? 'Tick off your first walk and watch this page grow.' : 'Look how far you’ve come!'}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatTile Icon={Footprints} value={`${st.completed}/${st.total}`} label="Training walks" />
        <StatTile Icon={Route} value={`${formatKm(st.trainingKm)} km`} label="Training distance" />
        <StatTile Icon={Clock} value={`${formatKm(st.hours)} h`} label="Walking time logged" />
        <StatTile Icon={Mountain} value={`${formatKm(st.longestKm)} km`} label="Longest walk" />
        <StatTile Icon={Flame} value={`${st.streak}`} label={st.streak === 1 ? 'Walk streak' : 'Walks in a row'} />
        <StatTile Icon={TrendingUp} value={`${st.percent}%`} label="Plan completed" />
      </div>

      <SectionTitle>Weekly distance</SectionTitle>
      <Card className="p-3 pt-4">
        <p className="mb-2 px-2 text-sm text-ink/70">Planned vs actual training km per week</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 4, right: 4, left: -22, bottom: 0 }} barGap={1}>
              <CartesianGrid vertical={false} stroke="#D8EDE1" />
              <XAxis dataKey="week" tick={axis} interval={2} tickLine={false} />
              <YAxis tick={axis} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number, n: string) => [`${v} km`, n]} cursor={{ fill: '#D8EDE155' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={false} dataKey="planned" name="Planned" fill="#D8EDE1" radius={[4, 4, 0, 0]} />
              <Bar isAnimationActive={false} dataKey="actual" name="Actual" fill="#3A956C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>Walks completed per week</SectionTitle>
      <Card className="p-3 pt-4">
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#D8EDE1" />
              <XAxis dataKey="week" tick={axis} interval={2} tickLine={false} />
              <YAxis tick={axis} allowDecimals={false} domain={[0, 3]} ticks={[0, 1, 2, 3]} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [`${v}`, 'Walks']} cursor={{ fill: '#D8EDE155' }} />
              <Bar isAnimationActive={false} dataKey="walks" name="Walks" fill="#193D35" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>Long-walk progression</SectionTitle>
      <Card className="p-3 pt-4">
        <p className="mb-2 px-2 text-sm text-ink/70">Saturday long walks, building to {EVENT_KM} km</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={longs} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#D8EDE1" />
              <XAxis dataKey="week" tick={axis} interval={2} tickLine={false} />
              <YAxis tick={axis} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number, n: string) => [`${v} km`, n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line isAnimationActive={false} type="monotone" dataKey="planned" name="Planned" stroke="#9CC7AF" strokeDasharray="5 4" strokeWidth={2} dot={false} />
              <Line isAnimationActive={false} type="monotone" dataKey="actual" name="Walked" stroke="#3A956C" strokeWidth={3} dot={{ r: 4, fill: '#3A956C' }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle right={<span className="text-sm font-semibold text-leaf">{unlocked}/{ms.length}</span>}>Milestones</SectionTitle>
      <div className="flex flex-col gap-2.5">
        {ms.map((m) => (
          <div key={m.id} className={`flex items-center gap-3 rounded-2xl p-3.5 ${m.unlocked ? 'bg-white shadow-soft ring-1 ring-leaf/30' : 'bg-white/60 ring-1 ring-ink/10'}`}>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${m.unlocked ? 'bg-lime text-forest' : 'bg-paper text-ink/35'}`}>
              {m.unlocked ? <Award size={22} /> : <Lock size={18} />}
            </span>
            <div className="min-w-0">
              <p className={`font-bold ${m.unlocked ? 'text-forest' : 'text-ink/60'}`}>{m.title}</p>
              <p className="text-sm text-ink/60">{m.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>Mammutmarsch estimate</SectionTitle>
      <Card className="p-5">
        <div className="flex gap-3">
          <Timer className="shrink-0 text-leaf" size={28} />
          {pace ? (
            <div>
              <p className="text-ink/80">Your average long-walk pace is <strong className="text-forest">{Math.floor(pace.pace)}:{String(Math.round((pace.pace % 1) * 60)).padStart(2, '0')} min/km</strong> (from {pace.walks} long {pace.walks === 1 ? 'walk' : 'walks'}).</p>
              <p className="mt-2 text-ink/80">At that pace, 42 km would take about <strong className="text-forest">{formatDuration(pace.pace * EVENT_KM)}</strong> of walking, plus breaks. Expect to slow down a little in the final kilometres.</p>
            </div>
          ) : (
            <p className="text-ink/80">Log the duration of your Saturday long walks and you’ll see an estimated Mammutmarsch walking time here.</p>
          )}
        </div>
      </Card>
    </div>
  )
}

function StatTile({ Icon, value, label }: { Icon: typeof Footprints; value: string; label: string }) {
  return (
    <Card className="p-4">
      <Icon className="text-leaf" size={22} />
      <p className="mt-2 truncate text-2xl font-extrabold text-forest">{value}</p>
      <p className="text-sm text-ink/65">{label}</p>
    </Card>
  )
}
