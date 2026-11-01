import { describe, expect, it } from 'vitest'
import { completeEntry, setEntryActivity, uncompleteEntry } from '../src/lib/entries'
import { ALL_SESSIONS, SESSION_BY_ID, SWIM_ELIGIBLE_SESSIONS, WEEKS, isSwimEligible } from '../src/lib/plan'
import {
  celebrationFor, computeStats, longWalkChart, milestones, monthlyTotals, statusOf, swimStats, weekTotals, weeklyChart,
} from '../src/lib/stats'
import { emptyData, exportPayload, validateData, type AppData } from '../src/lib/storage'

const plannedSnapshot = () => JSON.stringify(ALL_SESSIONS)
const NOW = '2026-11-14T12:00:00.000Z'
const SWIM_IDS = ['w4-sat', 'w6-sat', 'w8-sat', 'w10-sat', 'w12-sat', 'w14-sat', 'w16-sat']

describe('swim Saturdays (her "maybe swimming" weeks)', () => {
  it('are the even weeks 4 to 16, every other Saturday from Sat 14 Nov 2026 to Sat 6 Feb 2027', () => {
    expect(SWIM_ELIGIBLE_SESSIONS.map((s) => s.id)).toEqual(SWIM_IDS)
    expect(SWIM_ELIGIBLE_SESSIONS.map((s) => s.date)).toEqual([
      '2026-11-14', '2026-11-28', '2026-12-12', '2026-12-26', '2027-01-09', '2027-01-23', '2027-02-06',
    ])
    for (const s of SWIM_ELIGIBLE_SESSIONS) expect(s).toMatchObject({ type: 'swim', plannedKm: 0 })
  })
  it('long-walk Saturdays, weekdays, week 1, week 2 and the event offer no swim', () => {
    for (const id of ['w1-sat', 'w2-sat', 'w3-sat', 'w5-sat', 'w15-sat', 'w17-sat', 'w4-tue', 'w4-thu', 'event']) {
      expect(isSwimEligible(SESSION_BY_ID[id])).toBe(false)
    }
  })
})

describe('logging a swim Saturday', () => {
  it('a plain tick is a swim (the default); no km are logged', () => {
    const d = completeEntry(emptyData(), 'w4-sat', undefined, NOW)
    expect(d.entries['w4-sat']).toMatchObject({ completed: true, activity: 'swim' })
    expect(d.entries['w4-sat'].actualKm).toBeUndefined()
  })
  it('she can log a walk with whatever km she did; it counts as walking km', () => {
    let d: AppData = { ...emptyData(), entries: { 'w4-sat': { completed: false, actualKm: 9.5 } } }
    d = completeEntry(d, 'w4-sat', 'walk', NOW)
    expect(d.entries['w4-sat']).toMatchObject({ completed: true, activity: 'walk', actualKm: 9.5 })
    expect(computeStats(d, '2026-11-15').trainingKm).toBe(9.5)
    expect(weekTotals(d, 4)).toEqual({ walkedKm: 9.5, plannedKm: 11 })
    expect(swimStats(d, '2026-11-15')).toMatchObject({ swims: 0, walksOnSwimDays: 1 })
  })
  it('either way the day counts as done, and swims never count as walking km', () => {
    let d = completeEntry(emptyData(), 'w4-tue', undefined, NOW) // 5 km
    d = completeEntry(d, 'w4-sat', 'swim', NOW)
    const st = computeStats(d, '2026-11-15')
    expect(st.completed).toBe(2)
    expect(st.trainingKm).toBe(5)
    expect(st.longestKm).toBe(5)
    expect(statusOf(SESSION_BY_ID['w4-sat'], d, '2026-11-15')).toBe('completed')
    expect(weekTotals(d, 4)).toEqual({ walkedKm: 5, plannedKm: 11 })
    expect(weeklyChart(d)[3]).toMatchObject({ planned: 11, actual: 5, walks: 1 })
    expect(swimStats(d, '2026-11-15')).toMatchObject({ swims: 1, walksOnSwimDays: 0, swimDaysSoFar: 1, swimDates: ['2026-11-14'] })
    expect(celebrationFor('w4-sat', completeEntry(emptyData(), 'w4-tue', undefined, NOW), d).text ?? '').not.toMatch(/longest/i)
  })
  it('switching after ticking, and unticking returns to the swim default', () => {
    let d = completeEntry(emptyData(), 'w6-sat', 'swim', NOW)
    d = setEntryActivity(d, 'w6-sat', 'walk')
    expect(d.entries['w6-sat']).toMatchObject({ completed: true, activity: 'walk' })
    d = setEntryActivity(d, 'w6-sat', 'swim')
    expect(d.entries['w6-sat'].activity).toBe('swim')
    d = uncompleteEntry(d, 'w6-sat')
    expect(d.entries['w6-sat'].completed).toBe(false)
    expect(d.entries['w6-sat'].activity).toBeUndefined()
    expect(completeEntry(d, 'w6-sat', undefined, NOW).entries['w6-sat'].activity).toBe('swim')
  })
  it('a swim cannot be logged on a long-walk Saturday: it logs the planned walk', () => {
    const d = completeEntry(emptyData(), 'w5-sat', 'swim', NOW)
    expect(d.entries['w5-sat']).toMatchObject({ completed: true, actualKm: 18 })
    expect(d.entries['w5-sat'].activity).toBeUndefined()
    expect(setEntryActivity(d, 'w5-sat', 'swim')).toBe(d)
  })
  it('an unticked past swim Saturday is "not ticked off yet", never a failure', () => {
    expect(statusOf(SESSION_BY_ID['w4-sat'], emptyData(), '2026-11-20')).toBe('missed')
  })
})

describe('no-reload rule: swims never change the plan or later weeks', () => {
  it('plan sessions and planned weekly km are identical with or without swims', () => {
    const before = plannedSnapshot()
    const plannedWeeks = WEEKS.map((w) => weekTotals(emptyData(), w.number).plannedKm)
    let d: AppData = emptyData()
    for (const s of SWIM_ELIGIBLE_SESSIONS) d = completeEntry(d, s.id, 'swim', NOW)
    expect(plannedSnapshot()).toBe(before)
    expect(WEEKS.map((w) => weekTotals(d, w.number).plannedKm)).toEqual(plannedWeeks)
    expect(weeklyChart(d).map((r) => r.planned)).toEqual(weeklyChart(emptyData()).map((r) => r.planned))
    expect(Object.keys(d.entries).sort()).toEqual([...SWIM_IDS].sort())
  })
  it('long-walk chart only has weeks with a planned long walk or the event', () => {
    expect(longWalkChart(emptyData()).map((r) => `${r.week}:${r.planned}`)).toEqual([
      'W1:10', 'W2:12', 'W3:15', 'W5:18', 'W7:21', 'W9:24', 'W11:27', 'W13:30', 'W15:33', 'W17:13', 'W20:42',
    ])
  })
  it('milestone for her longest training walk is the 33 km on Sat 30 Jan', () => {
    const d = completeEntry(emptyData(), 'w15-sat', undefined, NOW)
    expect(milestones(d).find((m) => m.id === 'peaklong')).toMatchObject({ unlocked: true })
    expect(milestones(d).find((m) => m.id === 'km30')!.unlocked).toBe(true)
  })
})

describe('existing data survives the new plan', () => {
  const OLD = {
    version: 1, displayName: 'Andrea',
    entries: {
      'w1-sat': { completed: true, actualKm: 10, completedAt: '2026-10-24T15:00:00.000Z' },
      'w2-tue': { completed: true, actualKm: 4.5 },
      'w2-thu': { completed: true, actualKm: 5, notes: 'Rainy but fine' },
      'w2-sat': { completed: true, actualKm: 12.5, durationMin: 150 },
    },
    weekNotes: { '1': 'Lovely first walk' }, seenMilestones: ['first'],
  }
  it('her saved data loads unchanged with the same totals', () => {
    const d = validateData(JSON.parse(JSON.stringify(OLD)))
    expect(d.displayName).toBe('Andrea')
    for (const [id, e] of Object.entries(OLD.entries)) expect(d.entries[id]).toMatchObject(e)
    expect(d.weekNotes['1']).toBe('Lovely first walk')
    expect(d.seenMilestones).toEqual(['first'])
    expect(d.version).toBe(1)
    expect(d.archived).toBeUndefined()
    expect(computeStats(d, '2026-11-01')).toMatchObject({ completed: 4, trainingKm: 32 })
    // an old export file (with the app wrapper) imports too
    expect(validateData({ app: 'my-mammutmarsch-diary', exportedAt: 'x', data: OLD }).entries['w2-tue'].actualKm).toBe(4.5)
  })
  it('an old swim on w3-sat (a swim-or-walk Saturday in the old plan) stays logged as she recorded it', () => {
    const old = { ...OLD, entries: { ...OLD.entries, 'w3-sat': { completed: true, activity: 'swim', notes: 'Pool' } } }
    const d = validateData(old)
    expect(d.entries['w3-sat']).toMatchObject({ completed: true, activity: 'swim', notes: 'Pool' })
    expect(computeStats(d, '2026-11-08')).toMatchObject({ completed: 5, trainingKm: 32 })
    expect(swimStats(d, '2026-11-08').swims).toBe(1)
    // and it round-trips through export and import
    expect(validateData(JSON.parse(exportPayload(d))).entries['w3-sat'].activity).toBe('swim')
  })
  it('an old ticked Saturday walk without a typed distance keeps the old planned km it counted', () => {
    const old = { ...OLD, entries: { 'w3-sat': { completed: true }, 'w4-sat': { completed: true }, 'w5-sat': { completed: true, actualKm: 11 } } }
    const d = validateData(old)
    expect(d.entries['w3-sat'].actualKm).toBe(13) // old plan: 13 km
    expect(d.entries['w4-sat'].actualKm).toBe(15) // old plan: 15 km long walk, now a swim Saturday
    expect(d.entries['w4-sat'].activity).toBeUndefined() // a walk
    expect(d.entries['w5-sat'].actualKm).toBe(11)
    expect(computeStats(d, '2026-11-22').trainingKm).toBe(39)
    // loading again changes nothing
    expect(validateData(JSON.parse(JSON.stringify(d)))).toEqual(d)
  })
  it('a walk logged on a swim Saturday in the new app is never back-filled', () => {
    const d = validateData({ ...OLD, entries: { 'w4-sat': { completed: true, activity: 'walk' } } })
    expect(d.entries['w4-sat']).toMatchObject({ completed: true, activity: 'walk' })
    expect(d.entries['w4-sat'].actualKm).toBeUndefined()
  })
  it('entries on Saturdays the plan no longer has (20 Feb, 27 Feb) are archived, not dropped', () => {
    const old = { ...OLD, entries: { ...OLD.entries, 'w19-sat': { completed: true, activity: 'swim' }, 'w18-sat': { completed: false, notes: 'plan' } } }
    const d = validateData(old)
    expect(d.entries['w19-sat']).toBeUndefined()
    expect(d.archived).toMatchObject({ 'w19-sat': { completed: true, activity: 'swim' }, 'w18-sat': { completed: false, notes: 'plan' } })
    const back = validateData(JSON.parse(exportPayload(d)))
    expect(back.archived).toEqual(d.archived)
    expect(computeStats(back, '2027-03-01').completed).toBe(4)
  })
  it('a swim saved on a weekday is dropped, the tick kept', () => {
    const d = validateData({ ...OLD, entries: { 'w3-tue': { completed: true, actualKm: 5, activity: 'swim' } } })
    expect(d.entries['w3-tue']).toMatchObject({ completed: true, actualKm: 5 })
    expect(d.entries['w3-tue'].activity).toBeUndefined()
  })
  it('monthly planned km leave swim Saturdays out', () => {
    const nov = monthlyTotals(emptyData()).find((m) => m.key === '2026-11')!
    const expected = ALL_SESSIONS.filter((s) => s.date.startsWith('2026-11')).reduce((a, s) => a + s.plannedKm, 0)
    expect(nov.plannedKm).toBe(expected)
    expect(ALL_SESSIONS.filter((s) => s.date.startsWith('2026-11') && s.type === 'swim').every((s) => s.plannedKm === 0)).toBe(true)
  })
})
