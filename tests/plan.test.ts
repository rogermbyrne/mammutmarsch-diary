import { describe, expect, it } from 'vitest'
import { ALL_SESSIONS, EVENT_SESSION, TRAINING_SESSIONS, WEEKS } from '../src/lib/plan'
import { dayName, todayBerlin } from '../src/lib/dates'
import { computeStats, milestones, statusOf, upcomingSessions, computeStreak } from '../src/lib/stats'
import { emptyData, validateData, exportPayload, type AppData } from '../src/lib/storage'

const EXPECTED: [string, number[]][] = [
  ['2026-10-26', [4, 5, 12]], ['2026-11-02', [5, 5, 13]], ['2026-11-09', [5, 6, 15]], ['2026-11-16', [4, 5, 10]],
  ['2026-11-23', [5, 7, 16]], ['2026-11-30', [6, 7, 18]], ['2026-12-07', [6, 8, 20]], ['2026-12-14', [4, 6, 13]],
  ['2026-12-21', [6, 8, 21]], ['2026-12-28', [6, 8, 23]], ['2027-01-04', [7, 9, 25]], ['2027-01-11', [5, 6, 16]],
  ['2027-01-18', [7, 9, 26]], ['2027-01-25', [7, 10, 28]], ['2027-02-01', [5, 7, 20]], ['2027-02-08', [7, 10, 32]],
  ['2027-02-15', [5, 7, 20]], ['2027-02-22', [4, 5, 12]], ['2027-03-01', [3, 3, 42]],
]

describe('plan', () => {
  it('has 19 weeks starting on the right Mondays with exact distances', () => {
    expect(WEEKS).toHaveLength(19)
    WEEKS.forEach((w, i) => {
      expect(w.start).toBe(EXPECTED[i][0])
      expect(dayName(w.start)).toBe('Monday')
      expect(w.sessions.map((s) => s.plannedKm)).toEqual(EXPECTED[i][1])
      expect(w.sessions.map((s) => dayName(s.date))).toEqual(['Tuesday', 'Thursday', 'Saturday'])
    })
  })
  it('has 56 training walks and the event on Sat 6 Mar 2027', () => {
    expect(TRAINING_SESSIONS).toHaveLength(56)
    expect(ALL_SESSIONS).toHaveLength(57)
    expect(EVENT_SESSION.date).toBe('2027-03-06')
    expect(EVENT_SESSION.plannedKm).toBe(42)
  })
  it('rolls over Dec 2026 -> Jan 2027 correctly', () => {
    const w10 = WEEKS[9]
    expect(w10.sessions.map((s) => s.date)).toEqual(['2026-12-29', '2026-12-31', '2027-01-02'])
    expect(w10.end).toBe('2027-01-03')
    expect(WEEKS[10].sessions.map((s) => s.date)).toEqual(['2027-01-05', '2027-01-07', '2027-01-09'])
  })
  it('marks recovery weeks', () => {
    expect(WEEKS.filter((w) => w.recovery).map((w) => w.number)).toEqual([4, 8, 12, 15, 17, 18])
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
    done(d, 'w1-sat', 14) // actual overrides 12
    done(d, 'event', 43)
    const s = computeStats(d, '2026-11-01')
    expect(s.completed).toBe(2)
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
    done(d, 'w9-tue', 21)
    expect(milestones(d).find((m) => m.id === 'km20')!.unlocked).toBe(true)
  })
  it('streak and upcoming', () => {
    const d = emptyData()
    done(d, 'w1-tue'); done(d, 'w1-thu')
    expect(computeStreak(d, '2026-10-31')).toBe(2) // today's Sat not done yet does not break it
    expect(computeStreak(d, '2026-11-01')).toBe(0)
    expect(upcomingSessions(d, '2026-10-24')[0].id).toBe('w1-tue'.replace('tue', 'sat'))
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
