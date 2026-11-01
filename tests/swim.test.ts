import { describe, expect, it } from 'vitest'
import { completeEntry, setEntryActivity, uncompleteEntry } from '../src/lib/entries'
import { ALL_SESSIONS, SESSION_BY_ID, SWIM_ANCHOR, SWIM_ELIGIBLE_SESSIONS, WEEKS, isSwimEligible } from '../src/lib/plan'
import {
  SWIM_CROWDING_NOTE, SWIM_CROWDING_THRESHOLD, celebrationFor, computeStats, longWalkChart, milestones, swimStats,
  swimsCrowdingLongWalks, weekTotals, weeklyChart,
} from '../src/lib/stats'
import { emptyData, exportPayload, validateData, type AppData } from '../src/lib/storage'

const plannedSnapshot = () => JSON.stringify(ALL_SESSIONS)
const NOW = '2026-11-07T12:00:00.000Z'

describe('swim-or-walk Saturdays: anchor and alternation', () => {
  it('first eligible Saturday is Sat 7 Nov 2026, then every 14 days, last is Sat 13 Feb 2027', () => {
    expect(SWIM_ANCHOR).toBe('2026-11-07')
    expect(SWIM_ELIGIBLE_SESSIONS[0].date).toBe('2026-11-07')
    expect(SWIM_ELIGIBLE_SESSIONS[0].id).toBe('w3-sat')
    expect(SWIM_ELIGIBLE_SESSIONS.map((s) => s.date)).toEqual([
      '2026-11-07', '2026-11-21', '2026-12-05', '2026-12-19', '2027-01-02',
      '2027-01-16', '2027-01-30', '2027-02-13',
    ])
    expect(SWIM_ELIGIBLE_SESSIONS[SWIM_ELIGIBLE_SESSIONS.length - 1].date).toBe('2027-02-13')
    expect(SWIM_ELIGIBLE_SESSIONS.map((s) => s.id)).toEqual(['w3-sat', 'w5-sat', 'w7-sat', 'w9-sat', 'w11-sat', 'w13-sat', 'w15-sat', 'w17-sat'])
  })
  it('Saturdays before 7 Nov, the in-between Saturdays, weekdays and the event are walk-only', () => {
    expect(isSwimEligible(SESSION_BY_ID['w1-sat'])).toBe(false) // 24 Oct
    expect(isSwimEligible(SESSION_BY_ID['w2-sat'])).toBe(false) // 31 Oct
    expect(isSwimEligible(SESSION_BY_ID['w4-sat'])).toBe(false) // 14 Nov
    expect(isSwimEligible(SESSION_BY_ID['w6-sat'])).toBe(false) // 28 Nov
    expect(isSwimEligible(SESSION_BY_ID['w3-tue'])).toBe(false)
    expect(isSwimEligible(SESSION_BY_ID['w3-thu'])).toBe(false)
    expect(isSwimEligible(SESSION_BY_ID['event'])).toBe(false)
    expect(SESSION_BY_ID['w19-sat'].date).toBe('2027-02-27')
    expect(isSwimEligible(SESSION_BY_ID['w19-sat'])).toBe(false) // final long walk is walk-only
    // every eligible session is a planned Saturday long walk
    for (const s of SWIM_ELIGIBLE_SESSIONS) expect(s.type).toBe('long')
  })
})

describe('swim choice', () => {
  it('ticking as a swim logs a swim; ticking normally logs the long walk (the default)', () => {
    let d = completeEntry(emptyData(), 'w3-sat', 'swim', NOW)
    expect(d.entries['w3-sat']).toMatchObject({ completed: true, activity: 'swim' })
    expect(d.entries['w3-sat'].actualKm).toBeUndefined()
    d = completeEntry(emptyData(), 'w3-sat', undefined, NOW)
    expect(d.entries['w3-sat']).toMatchObject({ completed: true, actualKm: 13 })
    expect(d.entries['w3-sat'].activity).toBeUndefined()
  })
  it('a swim is refused on a walk-only session and logs the walk instead', () => {
    const d = completeEntry(emptyData(), 'w4-sat', 'swim', NOW)
    expect(d.entries['w4-sat']).toMatchObject({ completed: true, actualKm: 15 })
    expect(d.entries['w4-sat'].activity).toBeUndefined()
    expect(completeEntry(emptyData(), 'w2-sat', 'swim', NOW).entries['w2-sat'].activity).toBeUndefined()
  })
  it('switching after ticking, and unticking returns to the long walk default', () => {
    let d = completeEntry(emptyData(), 'w5-sat', 'walk', NOW)
    d = setEntryActivity(d, 'w5-sat', 'swim')
    expect(d.entries['w5-sat']).toMatchObject({ completed: true, activity: 'swim' })
    d = setEntryActivity(d, 'w5-sat', 'walk')
    expect(d.entries['w5-sat'].activity).toBeUndefined()
    d = setEntryActivity(d, 'w5-sat', 'swim')
    d = uncompleteEntry(d, 'w5-sat')
    expect(d.entries['w5-sat'].completed).toBe(false)
    expect(d.entries['w5-sat'].activity).toBeUndefined()
    expect(setEntryActivity(d, 'w4-sat', 'swim')).toBe(d) // walk-only Saturday cannot be switched
  })
  it('swims are their own activity: counted as swims, never as walking km', () => {
    let d = completeEntry(emptyData(), 'w3-tue', 'walk', NOW) // 5 km
    d = completeEntry(d, 'w3-sat', 'swim', NOW)
    const st = computeStats(d, '2026-11-08')
    expect(st.completed).toBe(2) // the Saturday is ticked off
    expect(st.trainingKm).toBe(5)
    expect(st.longestKm).toBe(5)
    expect(weekTotals(d, 3)).toEqual({ walkedKm: 5, plannedKm: 23 })
    expect(longWalkChart(d)[2]).toMatchObject({ planned: 13, actual: null })
    const sw = swimStats(d, '2026-11-08')
    expect(sw).toMatchObject({ swims: 1, longWalks: 0, eligibleSoFar: 1, swimDates: ['2026-11-07'] })
    expect(celebrationFor('w3-sat', completeEntry(emptyData(), 'w3-tue', 'walk', NOW), d).text ?? '').not.toMatch(/longest/i)
  })
  it('Sat 27 Feb (final long walk) offers no swim: a swim tick logs the long walk', () => {
    const d = completeEntry(emptyData(), 'w19-sat', 'swim', NOW)
    expect(d.entries['w19-sat']).toMatchObject({ completed: true, actualKm: 12 })
    expect(d.entries['w19-sat'].activity).toBeUndefined()
    expect(setEntryActivity(d, 'w19-sat', 'swim')).toBe(d)
    expect(milestones(d).find((m) => m.id === 'finallong')!.unlocked).toBe(true)
  })
  it('a swim already saved on Sat 27 Feb is left as she logged it', () => {
    const old = { version: 1, displayName: '', entries: { 'w19-sat': { completed: true, activity: 'swim' } }, weekNotes: {}, seenMilestones: [] }
    const d = validateData(old)
    expect(d.entries['w19-sat']).toMatchObject({ completed: true, activity: 'swim' })
    expect(milestones(d).find((m) => m.id === 'finallong')!.unlocked).toBe(false)
  })
})

describe('no-reload rule: picking a swim never changes the plan or later weeks', () => {
  it('plan sessions, planned km and later weekly plan totals are identical with or without swims', () => {
    const before = plannedSnapshot()
    const plannedWeeks = WEEKS.map((w) => weekTotals(emptyData(), w.number).plannedKm)
    let d: AppData = emptyData()
    for (const s of SWIM_ELIGIBLE_SESSIONS) d = completeEntry(d, s.id, 'swim', NOW)
    expect(plannedSnapshot()).toBe(before)
    expect(WEEKS.map((w) => weekTotals(d, w.number).plannedKm)).toEqual(plannedWeeks)
    expect(weeklyChart(d).map((r) => r.planned)).toEqual(weeklyChart(emptyData()).map((r) => r.planned))
    expect(SESSION_BY_ID['w4-sat'].plannedKm).toBe(15)
    expect(SESSION_BY_ID['w6-sat'].plannedKm).toBe(16)
    expect(SESSION_BY_ID['w8-sat'].plannedKm).toBe(20)
    // untouched later entries stay empty: nothing is re-planned or auto-filled
    expect(Object.keys(d.entries).sort()).toEqual(SWIM_ELIGIBLE_SESSIONS.map((s) => s.id).sort())
  })
})

describe('swim crowding note', () => {
  const swim = (d: AppData, id: string) => completeEntry(d, id, 'swim', NOW)
  const walk = (d: AppData, id: string) => completeEntry(d, id, 'walk', NOW)
  it(`threshold is ${SWIM_CROWDING_THRESHOLD} swims in a row with no long walk in that span`, () => {
    expect(SWIM_CROWDING_THRESHOLD).toBe(3)
    expect(SWIM_CROWDING_NOTE).not.toMatch(/\u2014|\u2013/)
  })
  it('no note for 1 or 2 swims, or when long walks happen in between', () => {
    let d = swim(emptyData(), 'w3-sat')
    expect(swimsCrowdingLongWalks(d)).toBe(false)
    d = swim(d, 'w5-sat')
    expect(swimsCrowdingLongWalks(d)).toBe(false)
    // Normal alternating use: swims on eligible Saturdays, long walks on the Saturdays between. No note.
    let alt = emptyData()
    for (const id of ['w3-sat', 'w4-sat', 'w5-sat', 'w6-sat', 'w7-sat']) alt = id === 'w4-sat' || id === 'w6-sat' ? walk(alt, id) : swim(alt, id)
    expect(swimsCrowdingLongWalks(alt)).toBe(false)
  })
  it('note when 3 eligible Saturdays in a row are swims and no long walk was done in that span', () => {
    let d = emptyData()
    d = swim(d, 'w3-sat'); d = swim(d, 'w5-sat'); d = swim(d, 'w7-sat')
    d = walk(d, 'w5-tue'); d = walk(d, 'w6-thu') // weekday walks do not count as long walks
    expect(swimsCrowdingLongWalks(d)).toBe(true)
    // one long walk inside the span clears it
    expect(swimsCrowdingLongWalks(walk(d, 'w6-sat'))).toBe(false)
    // the latest eligible Saturday walked as a long walk clears it
    expect(swimsCrowdingLongWalks(walk(d, 'w9-sat'))).toBe(false)
  })
})

describe('existing data survives', () => {
  it('v1 data saved before swims existed loads unchanged, everything counts as walks', () => {
    const old = { version: 1, displayName: 'Andrea', entries: { 'w1-sat': { completed: true, actualKm: 10, completedAt: '2026-10-24T15:00:00.000Z' }, 'w2-tue': { completed: true, actualKm: 4.5 }, 'w3-sat': { completed: false } }, weekNotes: { '1': 'Lovely first walk' }, seenMilestones: ['first'] }
    const d = validateData(JSON.parse(JSON.stringify(old)))
    expect(d.displayName).toBe('Andrea')
    expect(d.entries['w1-sat']).toMatchObject({ completed: true, actualKm: 10 })
    expect(d.entries['w1-sat'].activity).toBeUndefined()
    expect(d.weekNotes['1']).toBe('Lovely first walk')
    expect(computeStats(d, '2026-11-01')).toMatchObject({ completed: 2, trainingKm: 14.5 })
    expect(swimStats(d, '2026-11-01').swims).toBe(0)
    // an old export file (with the app wrapper) imports too
    expect(validateData({ app: 'my-mammutmarsch-diary', exportedAt: 'x', data: old }).entries['w2-tue'].actualKm).toBe(4.5)
  })
  it('swims round-trip through export and import; a swim on a walk-only session is dropped, the tick kept', () => {
    let d = completeEntry(emptyData(), 'w3-sat', 'swim', NOW)
    const back = validateData(JSON.parse(exportPayload(d)))
    expect(back.entries['w3-sat']).toMatchObject({ completed: true, activity: 'swim' })
    d = { ...d, entries: { ...d.entries, 'w4-sat': { completed: true, actualKm: 10, activity: 'swim' } } }
    const cleaned = validateData(JSON.parse(exportPayload(d)))
    expect(cleaned.entries['w4-sat']).toMatchObject({ completed: true, actualKm: 10 })
    expect(cleaned.entries['w4-sat'].activity).toBeUndefined()
    expect(cleaned.version).toBe(1)
  })
})
