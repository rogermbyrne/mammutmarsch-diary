import { describe, expect, it } from 'vitest'
import { celebrationFor } from '../src/lib/stats'
import { emptyData, type AppData } from '../src/lib/storage'

const tick = (d: AppData, id: string, km?: number): AppData =>
  ({ ...d, entries: { ...d.entries, [id]: { completed: true, actualKm: km } } })

describe('celebrationFor', () => {
  it('first walk is a big moment', () => {
    const a = emptyData()
    expect(celebrationFor('w1-sat', a, tick(a, 'w1-sat', 10))).toEqual({ level: 'big', text: 'First walk done!' })
  })
  it('an ordinary walk gets a small burst', () => {
    const a = tick(emptyData(), 'w1-sat', 10)
    expect(celebrationFor('w2-tue', a, tick(a, 'w2-tue', 4)).level).toBe('small')
  })
  it('finishing every walk in a week is big', () => {
    const a = tick(tick(tick(emptyData(), 'w1-sat', 10), 'w2-tue', 4), 'w2-thu', 5)
    expect(celebrationFor('w2-sat', a, tick(a, 'w2-sat', 12))).toEqual({ level: 'big', text: 'Week 2 complete!' })
  })
  it('a new longest walk is big', () => {
    const a = tick(emptyData(), 'w1-sat', 10)
    expect(celebrationFor('w3-sat', a, tick(a, 'w3-sat', 15))).toEqual({ level: 'big', text: 'New longest walk: 15 km!' })
  })
  it('a new distance milestone is big', () => {
    const a = tick(emptyData(), 'w1-sat', 10)
    expect(celebrationFor('w7-sat', a, tick(a, 'w7-sat', 20))).toEqual({ level: 'big', text: 'First 20 km walk!' })
  })
  it('the Mammutmarsch itself gets the finish celebration', () => {
    const a = tick(emptyData(), 'w1-sat', 10)
    expect(celebrationFor('event', a, tick(a, 'event', 42)).level).toBe('finish')
  })
})
