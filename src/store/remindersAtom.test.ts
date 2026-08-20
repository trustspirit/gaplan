import { describe, it, expect } from 'vitest'
import { createStore } from 'jotai'
import { remindersAtom, reminderHasAtom, reminderPresenceLoadingAtom } from './remindersAtom'

describe('reminderHasAtom', () => {
  it('reflects hasPending', () => {
    const store = createStore()
    expect(store.get(reminderHasAtom)).toBe(false)
    store.set(remindersAtom, {
      hasPending: true,
      presenceLoading: false,
      loaded: false,
      interviewReminders: [],
      meetingReminders: [],
      loading: false,
    })
    expect(store.get(reminderHasAtom)).toBe(true)
  })
})

describe('reminderPresenceLoadingAtom', () => {
  // 초기값이 false면 벨/배너가 '리마인더 없음'을 확정 사실처럼 렌더했다가
  // presence 응답이 오는 순간 튀어나온다. 기본은 반드시 로딩 중이어야 한다.
  it('starts as loading so consumers do not render a premature empty state', () => {
    const store = createStore()
    expect(store.get(reminderPresenceLoadingAtom)).toBe(true)
  })

  it('clears once presence is known', () => {
    const store = createStore()
    store.set(remindersAtom, {
      hasPending: false,
      presenceLoading: false,
      loaded: false,
      interviewReminders: [],
      meetingReminders: [],
      loading: false,
    })
    expect(store.get(reminderPresenceLoadingAtom)).toBe(false)
  })
})
