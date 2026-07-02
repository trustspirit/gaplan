import { describe, it, expect } from 'vitest'
import { createStore } from 'jotai'
import { remindersAtom, reminderCountAtom } from './remindersAtom'

describe('reminderCountAtom', () => {
  it('interview + meeting 개수를 합산한다', () => {
    const store = createStore()
    store.set(remindersAtom, {
      loading: false,
      interviewReminders: [{ key: 'i1' }, { key: 'i2' }] as never,
      meetingReminders: [{ key: 'm1' }] as never,
    })
    expect(store.get(reminderCountAtom)).toBe(3)
  })
  it('초기값은 0', () => {
    const store = createStore()
    expect(store.get(reminderCountAtom)).toBe(0)
  })
})
