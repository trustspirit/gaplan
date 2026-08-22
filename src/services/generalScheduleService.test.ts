import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDoc } from 'firebase/firestore'

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn().mockResolvedValue({ id: 'new-id' }),
  collection: vi.fn((...args: unknown[]) => ({ kind: 'collection', args })),
  doc: vi.fn((...args: unknown[]) => ({ kind: 'doc', args })),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
}))

vi.mock('firebase/firestore', () => firestoreMocks)
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }))
vi.mock('@/firebase', () => ({ db: 'db', functions: 'functions' }))

import { createGeneralSchedule, updateGeneralSchedule } from './generalScheduleService'

describe('createGeneralSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 설명(또는 시간)을 비워두면 폼이 description: undefined를 넘기는데,
  // 이 값이 그대로 addDoc에 전달되면 Firestore가 invalid data 에러를 던진다.
  it('does not pass a key with an undefined value to addDoc', async () => {
    await createGeneralSchedule({
      title: '전체 야유회',
      date: '2026-09-01',
      description: undefined,
      startTime: undefined,
      endTime: undefined,
      category: 'other',
      createdBy: 'uid-1',
      isPublic: false,
    })

    expect(addDoc).toHaveBeenCalled()
    const payload = firestoreMocks.addDoc.mock.calls[0][1] as Record<string, unknown>
    const undefinedKeys = Object.keys(payload).filter(k => payload[k] === undefined)
    expect(undefinedKeys).toEqual([])
  })
})

describe('updateGeneralSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not pass a key with an undefined value to updateDoc', async () => {
    await updateGeneralSchedule('gs-1', {
      description: undefined,
      startTime: undefined,
    })

    const payload = firestoreMocks.updateDoc.mock.calls[0][1] as Record<string, unknown>
    const undefinedKeys = Object.keys(payload).filter(k => payload[k] === undefined)
    expect(undefinedKeys).toEqual([])
  })
})
