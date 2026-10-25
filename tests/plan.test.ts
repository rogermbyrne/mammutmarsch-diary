import { describe, expect, it } from 'vitest'
import { ALL_SESSIONS, EVENT_DATE, EVENT_SESSION, FINAL_LONG_ID, SESSION_BY_ID, TOTAL_WEEKS, TRAINING_SESSIONS, TRAINING_START, WEEKS } from '../src/lib/plan'
import { dayName, todayBerlin } from '../src/lib/dates'
import { computeStats, milestones, statusOf, upcomingSessions, computeStreak, kmFor, weekTotals, monthlyTotals, weeklyChart, longWalkChart, longWalkPace } from '../src/lib/stats'
import { emptyData, initialData, loadData, saveData, STORAGE_KEY, validateData, exportPayload, type AppData } from '../src/lib/storage'

const EXPECTED: [string, number[]][] = [
  ['2026-10-19', [4, 5, 10]],
  ['2026-10-26', [4, 5, 12]], ['2026-11-02', [5, 5, 13]], ['2026-11-09', [5, 6, 15]], ['2026-11-16', [4, 5, 10]],
  ['2026-11-23', [5, 7, 16]], ['2026-11-30', [6, 7, 18]], ['2026-12-07', [6, 8, 20]], ['2026-12-14', [4, 6, 13]],
  ['2026-12-21', [6, 8, 21]], ['2026-12-28', [6, 8, 23]], ['2027-01-04', [7, 9, 25]], ['2027-01-11', [5, 6, 16]],
  ['2027-01-18', [7, 9, 26]], ['2027-01-25', [7, 10, 28]], ['2027-02-01', [5, 7, 20]], ['2027-02-08', [7, 10, 32]],
  ['2027-02-15', [5, 7, 20]], ['2027-02-22', [4, 5, 12]], ['2027-03-01', [3, 3, 42]],
]

describe('plan', () => {
  it('has 20 weeks starting on the right Mondays with exact distances', () => {
    expect(TOTAL_WEEKS).toBe(20)
    expect(TRAINING_START).toBe('2026-10-19')
    expect(WEEKS).toHaveLength(20)
    WEEKS.forEach((w, i) => {
      expect(w.start).toBe(EXPECTED[i][0])
      expect(dayName(w.start)).toBe('Monday')
      expect(w.sessions.map((s) => s.plannedKm)).toEqual(EXPECTED[i][1])
      expect(w.sessions.map((s) => dayName(s.date))).toEqual(['Tuesday', 'Thursday', 'Saturday'])
    })
  })
  it('starts with the Sat 24 Oct 2026 10 km walk as week 1', () => {
    const sat = WEEKS[0].sessions[2]
    expect(sat.id).toBe('w1-sat')
    expect(sat.date).toBe('2026-10-24')
    expect(sat.plannedKm).toBe(10)
    expect(FINAL_LONG_ID).toBe('w19-sat')
    expect(SESSION_BY_ID[FINAL_LONG_ID].date).toBe('2027-02-27')
  })
  it('has 59 training walks and the event on Sat 6 Mar 2027', () => {
    expect(TRAINING_SESSIONS).toHaveLength(59)
    expect(ALL_SESSIONS).toHaveLength(60)
    expect(EVENT_SESSION.date).toBe('2027-03-06')
    expect(EVENT_SESSION.date).toBe(EVENT_DATE)
    expect(EVENT_SESSION.week).toBe(20)
    expect(EVENT_SESSION.plannedKm).toBe(42)
  })
  it('rolls over Dec 2026 -> Jan 2027 correctly', () => {
    const w11 = WEEKS[10]
    expect(w11.sessions.map((s) => s.date)).toEqual(['2026-12-29', '2026-12-31', '2027-01-02'])
    expect(w11.end).toBe('2027-01-03')
    expect(WEEKS[11].sessions.map((s) => s.date)).toEqual(['2027-01-05', '2027-01-07', '2027-01-09'])
  })
  it('marks recovery weeks', () => {
    expect(WEEKS.filter((w) => w.recovery).map((w) => w.number)).toEqual([5, 9, 13, 16, 18, 19])
  })
  it('Berlin today handles late-evening UTC', () => {
    expect(todayBerlin(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01')
  })
})

describe('stats', () => {
  const done = (d: AppData, id: string, actualKm?: number) => { d.entries[id] = { completed: true, actualKm } }
  it('counts, overrides with actual distance, and excludes the event from training stats', () => {
    const d = emptyData()
    done(d, 'w1-tue') // planned 4
    done(d, 'w1-sat', 14) // actual overrides 10
    done(d, 'event', 43)
    const s = computeStats(d, '2026-11-01')
    expect(s.completed).toBe(2)
    expect(s.trainingKm).toBe(18)
    expect(s.totalKm).toBe(61)
    expect(s.percent).toBe(3)
    expect(s.longestKm).toBe(14)
    d.entries['w1-sat'].completed = false
    expect(computeStats(d, '2026-11-01').completed).toBe(1)
    expect(computeStats(d, '2026-11-01').trainingKm).toBe(4)
  })
  it('never auto-completes past sessions', () => {
    const d = emptyData()
    expect(statusOf(WEEKS[0].sessions[0], d, '2027-01-01')).toBe('missed')
    expect(computeStats(d, '2027-03-10').completed).toBe(0)
  })
  it('distance milestones need recorded distance', () => {
    const d = emptyData()
    expect(milestones(d).every((m) => !m.unlocked)).toBe(true)
    done(d, 'w7-sat', 19)
    expect(milestones(d).find((m) => m.id === 'km20')!.unlocked).toBe(false)
    done(d, 'w9-tue', 21)
    expect(milestones(d).find((m) => m.id === 'km20')!.unlocked).toBe(true)
  })
  it('streak and upcoming', () => {
    const d = emptyData()
    done(d, 'w1-tue'); done(d, 'w1-thu')
    expect(computeStreak(d, '2026-10-24')).toBe(2) // today's Sat not done yet does not break it
    expect(computeStreak(d, '2026-10-25')).toBe(0)
    expect(upcomingSessions(d, '2026-10-24')[0].id).toBe('w1-sat')
  })
  it('validates import data and round-trips export', () => {
    const d = emptyData(); done(d, 'w2-sat', 13.5); d.displayName = 'Anna'
    const back = validateData(JSON.parse(exportPayload(d)))
    expect(back.entries['w2-sat']).toMatchObject({ completed: true, actualKm: 13.5 })
    expect(back.displayName).toBe('Anna')
    expect(() => validateData({ foo: 1 })).toThrow()
    expect(() => validateData({ app: 'other', data: {} })).toThrow()
  })
})

describe('actual distance overrides planned in every total', () => {
  const log = (d: AppData, id: string, actualKm?: number, durationMin?: number) => { d.entries[id] = { completed: true, actualKm, durationMin } }
  it('actual > planned counts the actual (week 2: Tue 4.5 on 4, Thu 6 on 5, Sat 13 on 12)', () => {
    const d = emptyData()
    log(d, 'w2-tue', 4.5); log(d, 'w2-thu', 6); log(d, 'w2-sat', 13, 156)
    expect(kmFor(SESSION_BY_ID['w2-tue'], d.entries['w2-tue'])).toBe(4.5)
    const st = computeStats(d, '2026-11-02')
    expect(st.trainingKm).toBe(23.5)
    expect(st.totalKm).toBe(23.5)
    expect(st.longestKm).toBe(13)
    expect(weekTotals(d, 2)).toEqual({ walkedKm: 23.5, plannedKm: 21 })
    expect(weeklyChart(d)[1]).toMatchObject({ planned: 21, actual: 23.5, walks: 3 })
    expect(longWalkChart(d)[1]).toMatchObject({ planned: 12, actual: 13 })
    expect(longWalkPace(d)!.pace).toBeCloseTo(12) // 156 min / 13 km actual, not 12 km planned
    const oct = monthlyTotals(d).find((m) => m.key === '2026-10')!
    expect(oct.walkedKm).toBe(23.5) // all of week 2 falls in Oct 2026
    expect(oct.walks).toBe(3)
  })
  it('actual < planned also counts the actual', () => {
    const d = emptyData(); log(d, 'w3-sat', 11)
    expect(computeStats(d, '2026-11-08').trainingKm).toBe(11)
    expect(weekTotals(d, 3).walkedKm).toBe(11)
  })
  it('no actual logged falls back to planned, and not completed counts 0', () => {
    const d = emptyData(); log(d, 'w2-sat') // planned 12, no actual
    expect(computeStats(d, '2026-11-01').trainingKm).toBe(12)
    expect(weekTotals(d, 2)).toEqual({ walkedKm: 12, plannedKm: 21 })
    expect(longWalkChart(d)[1].actual).toBe(12)
    d.entries['w2-tue'] = { completed: false, actualKm: 9 }
    expect(computeStats(d, '2026-11-01').trainingKm).toBe(12)
    expect(monthlyTotals(d).find((m) => m.key === '2026-10')!.walkedKm).toBe(12)
  })
  it('monthly totals follow the date a rescheduled walk was actually done', () => {
    const d = emptyData(); d.entries['w3-sat'] = { completed: true, actualKm: 16, rescheduledDate: '2026-11-01' }
    expect(monthlyTotals(d).find((m) => m.key === '2026-11')!.walkedKm).toBe(16)
  })
})

describe('first-load seed (24 Oct 10 km walk)', () => {
  const store: Record<string, string> = {}
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    key: () => null, length: 0,
  } as Storage
  it('seeds week 1 Saturday as completed only when nothing is saved', () => {
    localStorage.clear()
    const { data } = loadData()
    expect(data.entries['w1-sat']).toMatchObject({ completed: true, actualKm: 10, completedAt: '2026-10-24', difficulty: 'moderate' })
    expect(Object.keys(data.entries)).toEqual(['w1-sat'])
    expect(computeStats(data, '2026-10-26')).toMatchObject({ completed: 1, trainingKm: 10, longestKm: 10 })
    expect(milestones(data).find((m) => m.id === 'first')!.unlocked).toBe(true)
    expect(validateData(JSON.parse(exportPayload(initialData())))).toEqual(initialData())
  })
  it('never overwrites existing saved data', () => {
    localStorage.clear()
    const mine = emptyData(); mine.entries['w2-tue'] = { completed: true, actualKm: 4.5 }; mine.displayName = 'Andrea'
    saveData(mine)
    const { data } = loadData()
    expect(data.entries['w1-sat']).toBeUndefined()
    expect(data.entries['w2-tue']).toMatchObject({ completed: true, actualKm: 4.5 })
    expect(data.displayName).toBe('Andrea')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(mine))
  })
  it('emptyData stays empty (used by Reset)', () => {
    expect(emptyData().entries).toEqual({})
  })
})
