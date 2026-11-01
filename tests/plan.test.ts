import { describe, expect, it } from 'vitest'
import { ALL_SESSIONS, EVENT_DATE, EVENT_SESSION, FINAL_LONG_ID, SESSION_BY_ID, TOTAL_WEEKS, TRAINING_SESSIONS, TRAINING_START, WEEKS, weekForDate } from '../src/lib/plan'
import { dayName, todayBerlin } from '../src/lib/dates'
import { computeStats, milestones, statusOf, upcomingSessions, computeStreak, kmFor, weekTotals, monthlyTotals, weeklyChart, longWalkChart, longWalkPace } from '../src/lib/stats'
import { emptyData, loadData, saveData, STORAGE_KEY, validateData, exportPayload, type AppData } from '../src/lib/storage'

// Weeks 2 to 20: [Tue, Thu, Sat] planned km. Sat is 0 on a swim Saturday (no walk planned); weeks 18 and 19 have no Saturday.
const EXPECTED: [string, number[]][] = [
  ['2026-10-26', [4, 5, 12]], ['2026-11-02', [5, 5, 15]], ['2026-11-09', [5, 6, 0]], ['2026-11-16', [4, 5, 18]],
  ['2026-11-23', [5, 7, 0]], ['2026-11-30', [6, 7, 21]], ['2026-12-07', [6, 8, 0]], ['2026-12-14', [4, 6, 24]],
  ['2026-12-21', [6, 8, 0]], ['2026-12-28', [6, 8, 27]], ['2027-01-04', [7, 9, 0]], ['2027-01-11', [5, 6, 30]],
  ['2027-01-18', [7, 9, 0]], ['2027-01-25', [7, 10, 33]], ['2027-02-01', [5, 7, 0]], ['2027-02-08', [7, 10, 13]],
  ['2027-02-15', [5, 7]], ['2027-02-22', [4, 5]], ['2027-03-01', [3, 3, 42]],
]

describe('plan', () => {
  it('has 20 weeks: an intro week, then Monday weeks 2 to 20 with exact distances', () => {
    expect(TOTAL_WEEKS).toBe(20)
    expect(TRAINING_START).toBe('2026-10-17')
    expect(WEEKS).toHaveLength(20)
    WEEKS.slice(1).forEach((w, i) => {
      expect(w.start).toBe(EXPECTED[i][0])
      expect(dayName(w.start)).toBe('Monday')
      expect(w.sessions.map((s) => s.plannedKm)).toEqual(EXPECTED[i][1])
      expect(w.sessions.map((s) => dayName(s.date))).toEqual(['Tuesday', 'Thursday', 'Saturday'].slice(0, EXPECTED[i][1].length))
    })
    expect(WEEKS[1].start).toBe('2026-10-26')
  })
  it('week 1 is Sat 17 Oct to Sun 25 Oct with one 10 km long walk on Sat 24 Oct', () => {
    const w1 = WEEKS[0]
    expect(w1.start).toBe('2026-10-17')
    expect(dayName(w1.start)).toBe('Saturday')
    expect(w1.end).toBe('2026-10-25')
    expect(w1.sessions).toHaveLength(1)
    expect(w1.sessions[0]).toMatchObject({ id: 'w1-sat', date: '2026-10-24', type: 'long', plannedKm: 10, isEvent: false })
    expect(SESSION_BY_ID['w1-tue']).toBeUndefined()
    expect(SESSION_BY_ID['w1-thu']).toBeUndefined()
    expect(weekForDate('2026-10-10')).toBe(1)
    expect(weekForDate('2026-10-17')).toBe(1)
    expect(weekForDate('2026-10-25')).toBe(1)
    expect(weekForDate('2026-10-26')).toBe(2)
    expect(weekForDate('2027-03-06')).toBe(20)
    expect(FINAL_LONG_ID).toBe('w17-sat')
    expect(SESSION_BY_ID[FINAL_LONG_ID].date).toBe('2027-02-13')
    expect(SESSION_BY_ID[FINAL_LONG_ID].plannedKm).toBe(13)
  })
  it('has 55 training sessions (48 walks and 7 swim Saturdays) and the event on Sat 6 Mar 2027', () => {
    expect(TRAINING_SESSIONS).toHaveLength(55)
    expect(TRAINING_SESSIONS.filter((s) => s.type === 'swim')).toHaveLength(7)
    expect(ALL_SESSIONS).toHaveLength(56)
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
  it('follows her handwritten plan: long walks every other Saturday from 7 Nov, swim weeks between, taper weeks 17 to 19', () => {
    const longs = TRAINING_SESSIONS.filter((s) => s.type === 'long' && s.week >= 3).map((s) => [s.id, s.date, s.plannedKm])
    expect(longs).toEqual([
      ['w3-sat', '2026-11-07', 15], ['w5-sat', '2026-11-21', 18], ['w7-sat', '2026-12-05', 21], ['w9-sat', '2026-12-19', 24],
      ['w11-sat', '2027-01-02', 27], ['w13-sat', '2027-01-16', 30], ['w15-sat', '2027-01-30', 33], ['w17-sat', '2027-02-13', 13],
    ])
    expect(WEEKS.filter((w) => w.swimWeek).map((w) => w.number)).toEqual([4, 6, 8, 10, 12, 14, 16])
    expect(WEEKS.filter((w) => w.taper).map((w) => w.number)).toEqual([17, 18, 19])
    expect(SESSION_BY_ID['w18-sat']).toBeUndefined()
    expect(SESSION_BY_ID['w19-sat']).toBeUndefined()
    // unchanged: week 1, week 2 and the event
    expect(SESSION_BY_ID['w1-sat'].plannedKm).toBe(10)
    expect(SESSION_BY_ID['w2-sat']).toMatchObject({ date: '2026-10-31', plannedKm: 12, type: 'long' })
    expect(EVENT_SESSION).toMatchObject({ date: '2027-03-06', plannedKm: 42 })
  })
  it('planned weekly km leave the swim Saturdays out', () => {
    expect(weekTotals(emptyData(), 3).plannedKm).toBe(25)
    expect(weekTotals(emptyData(), 4).plannedKm).toBe(11)
    expect(weekTotals(emptyData(), 15).plannedKm).toBe(50)
    expect(weekTotals(emptyData(), 18).plannedKm).toBe(12)
    expect(Math.max(...WEEKS.map((w) => weekTotals(emptyData(), w.number).plannedKm))).toBe(50)
  })
  it('Berlin today handles late-evening UTC', () => {
    expect(todayBerlin(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01')
  })
})

describe('stats', () => {
  const done = (d: AppData, id: string, actualKm?: number) => { d.entries[id] = { completed: true, actualKm } }
  it('counts, overrides with actual distance, and excludes the event from training stats', () => {
    const d = emptyData()
    done(d, 'w2-tue') // planned 4
    done(d, 'w1-sat', 14) // actual overrides 10
    done(d, 'event', 43)
    const s = computeStats(d, '2026-11-01')
    expect(s.completed).toBe(2)
    expect(s.total).toBe(55)
    expect(s.trainingKm).toBe(18)
    expect(s.totalKm).toBe(61)
    expect(s.percent).toBe(4)
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
    done(d, 'w9-sat', 21)
    expect(milestones(d).find((m) => m.id === 'km20')!.unlocked).toBe(true)
  })
  it('streak and upcoming', () => {
    const d = emptyData()
    done(d, 'w2-tue'); done(d, 'w2-thu')
    expect(computeStreak(d, '2026-10-31')).toBe(2) // today's Sat not done yet does not break it
    expect(computeStreak(d, '2026-11-01')).toBe(0)
    expect(upcomingSessions(d, '2026-10-24')[0].id).toBe('w1-sat')
    expect(upcomingSessions(d, '2026-10-25')[0].id).toBe('w2-sat')
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

describe('first load and saved data', () => {
  const store: Record<string, string> = {}
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    key: () => null, length: 0,
  } as Storage
  it('first load has no completed walks (week 1 walk is left for her to tick)', () => {
    localStorage.clear()
    const { data } = loadData()
    expect(data).toEqual(emptyData())
    expect(Object.values(data.entries).filter((e) => e.completed)).toHaveLength(0)
    expect(computeStats(data, '2026-10-25')).toMatchObject({ completed: 0, total: 55, trainingKm: 0 })
    expect(statusOf(SESSION_BY_ID['w1-sat'], data, '2026-10-25')).toBe('missed')
  })
  it('ticking the week 1 walk adds 10 km to the totals', () => {
    const d = emptyData(); d.entries['w1-sat'] = { completed: true }
    expect(computeStats(d, '2026-10-25')).toMatchObject({ completed: 1, trainingKm: 10, longestKm: 10 })
    expect(weekTotals(d, 1)).toEqual({ walkedKm: 10, plannedKm: 10 })
    expect(monthlyTotals(d).find((m) => m.key === '2026-10')!.walkedKm).toBe(10)
  })
  it('never overwrites existing saved data', () => {
    localStorage.clear()
    const mine = emptyData(); mine.entries['w2-tue'] = { completed: true, actualKm: 4.5 }; mine.displayName = 'Andrea'
    saveData(mine)
    const { data } = loadData()
    expect(data.entries['w2-tue']).toMatchObject({ completed: true, actualKm: 4.5 })
    expect(data.displayName).toBe('Andrea')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(mine))
  })
})
