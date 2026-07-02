import { describe, it, expect } from 'vitest'
import { createStore } from 'jotai'
import { remindersAtom, reminderHasAtom } from './remindersAtom'

describe('reminderHasAtom', () => {
  it('reflects hasPending', () => {
    const store = createStore()
    expect(store.get(reminderHasAtom)).toBe(false)
    store.set(remindersAtom, {
      hasPending: true,
      loaded: false,
      interviewReminders: [],
      meetingReminders: [],
      loading: false,
    })
    expect(store.get(reminderHasAtom)).toBe(true)
  })
})
