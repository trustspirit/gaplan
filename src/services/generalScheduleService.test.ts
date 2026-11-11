import { beforeEach, describe, expect, it, vi } from 'vitest'

// 행사와 칠십인 전용 메모는 한 배치로 쓴다 — 생성은 addDoc이 아니라 batch.set이다.
const batchMock = vi.hoisted(() => ({
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
}))

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn((...args: unknown[]) => ({ kind: 'collection', args })),
  // doc(collectionRef)는 새 id를 만들고, doc(db, 'col', id)는 그 문서를 가리킨다.
  doc: vi.fn((...args: unknown[]) => ({ kind: 'doc', args, id: 'new-id', path: args.slice(1).join('/') })),
  writeBatch: vi.fn(() => batchMock),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  deleteField: vi.fn(() => 'delete-field'),
  query: vi.fn((...args: unknown[]) => ({ kind: 'query', args })),
  where: vi.fn((...args: unknown[]) => ({ kind: 'where', args })),
  orderBy: vi.fn((...args: unknown[]) => ({ kind: 'orderBy', args })),
  onSnapshot: vi.fn(() => () => {}),
}))

vi.mock('firebase/firestore', () => firestoreMocks)
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }))
vi.mock('@/firebase', () => ({ db: 'db', functions: 'functions' }))

import {
  createGeneralSchedule, deleteGeneralSchedule, subscribeToGeneralSchedules, updateGeneralSchedule,
} from './generalScheduleService'

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

    expect(batchMock.commit).toHaveBeenCalled()
    const payload = batchMock.set.mock.calls[0][1] as Record<string, unknown>
    const undefinedKeys = Object.keys(payload).filter(k => payload[k] === undefined)
    expect(undefinedKeys).toEqual([])
  })
})

// 회장 계정은 seventyOnly == false로 행사를 조회한다. 필드가 빠진 행사는 그 조회에 걸리지
// 않아 회장에게만 조용히 안 보이므로, 만들 때 항상 boolean으로 쓴다.
describe('createGeneralSchedule — seventyOnly', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const base = {
    title: '전체 야유회', date: '2026-09-01', category: 'other' as const, createdBy: 'uid-1', isPublic: false,
  }

  it('seventyOnly를 넘기지 않아도 false로 쓴다', async () => {
    await createGeneralSchedule(base)
    expect(batchMock.set.mock.calls[0][1]).toMatchObject({ seventyOnly: false })
  })

  it('칠십인 전용 행사는 true로 쓴다', async () => {
    await createGeneralSchedule({ ...base, seventyOnly: true })
    expect(batchMock.set.mock.calls[0][1]).toMatchObject({ seventyOnly: true })
  })
})

// 보안 규칙이 칠십인 전용 행사를 회장에게서 막는다. 규칙은 필터가 아니라서, 회장 계정의
// 조회가 seventyOnly == false 조건을 달지 않으면 조회 전체가 거부된다.
describe('subscribeToGeneralSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const seventyOnlyFilter = () =>
    firestoreMocks.where.mock.calls.find((args) => args[0] === 'seventyOnly')

  it('칠십인 전용을 볼 수 없는 사용자는 seventyOnly == false 조건으로 조회한다', () => {
    subscribeToGeneralSchedules(vi.fn(), undefined, { includeSeventyOnly: false })
    expect(seventyOnlyFilter()).toEqual(['seventyOnly', '==', false])
  })

  it('칠십인 전용을 볼 수 있는 사용자는 그 조건 없이 전부 조회한다', () => {
    subscribeToGeneralSchedules(vi.fn(), undefined, { includeSeventyOnly: true })
    expect(seventyOnlyFilter()).toBeUndefined()
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

  // 수정 폼에서 종료일·시간·설명을 비우면 undefined로 온다. 그 키를 그냥 걷어내면
  // updateDoc이 필드를 건드리지 않아, 저장됐다는 토스트 뒤에 예전 값이 그대로 남는다.
  it('clears the optional fields the form emptied instead of leaving the old values', async () => {
    await updateGeneralSchedule('gs-1', {
      title: '행사',
      endDate: undefined,
      startTime: undefined,
      endTime: undefined,
      description: undefined,
    })

    const payload = firestoreMocks.updateDoc.mock.calls[0][1] as Record<string, unknown>
    expect(payload).toEqual({
      title: '행사',
      endDate: 'delete-field',
      startTime: 'delete-field',
      endTime: 'delete-field',
      description: 'delete-field',
    })
  })

  it('leaves untouched the fields a partial update did not mention', async () => {
    await updateGeneralSchedule('gs-1', { isPublic: true })

    expect(firestoreMocks.updateDoc.mock.calls[0][1]).toEqual({ isPublic: true })
  })
})

// 칠십인 전용 메모는 행사 문서의 필드가 아니다 — 회장이 행사 문서를 읽기 때문에
// generalScheduleSeventyNotes/{id}에 따로 쓴다.
describe('칠십인 전용 메모', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const base = {
    title: '전체 야유회', date: '2026-09-01', category: 'other' as const, createdBy: 'uid-1', isPublic: false,
  }
  const pathOf = (ref: unknown) => (ref as { path: string }).path

  it('만들 때 메모가 있으면 행사와 메모를 한 배치로 쓰고, 메모는 행사 문서에 넣지 않는다', async () => {
    await createGeneralSchedule(base, '  전용 메모  ')
    expect(batchMock.set).toHaveBeenCalledTimes(2)
    expect(batchMock.set.mock.calls[0][1]).not.toHaveProperty('seventyNotes')
    expect(pathOf(batchMock.set.mock.calls[1][0])).toBe('generalScheduleSeventyNotes/new-id')
    expect(batchMock.set.mock.calls[1][1]).toMatchObject({ date: '2026-09-01', notes: '전용 메모' })
  })

  it('만들 때 메모가 없으면 메모 문서를 쓰지 않는다', async () => {
    await createGeneralSchedule(base)
    expect(batchMock.set).toHaveBeenCalledTimes(1)
  })

  it('수정에서 메모를 넘기지 않으면 메모를 건드리지 않는다 — 공개 전환 같은 부분 수정', async () => {
    await updateGeneralSchedule('gs-1', { isPublic: true })
    expect(firestoreMocks.updateDoc).toHaveBeenCalled()
    expect(batchMock.set).not.toHaveBeenCalled()
    expect(batchMock.delete).not.toHaveBeenCalled()
  })

  it('수정에서 메모를 넘기면 행사 날짜와 함께 쓴다', async () => {
    await updateGeneralSchedule('gs-1', { title: '행사' }, { notes: '새 메모', date: '2026-09-02' })
    expect(pathOf(batchMock.set.mock.calls[0][0])).toBe('generalScheduleSeventyNotes/gs-1')
    expect(batchMock.set.mock.calls[0][1]).toMatchObject({ date: '2026-09-02', notes: '새 메모' })
    expect(batchMock.commit).toHaveBeenCalled()
  })

  it('수정에서 메모를 비우면 메모 문서를 지운다', async () => {
    await updateGeneralSchedule('gs-1', { title: '행사' }, { notes: null, date: '2026-09-02' })
    expect(pathOf(batchMock.delete.mock.calls[0][0])).toBe('generalScheduleSeventyNotes/gs-1')
  })

  it('행사를 지우면 메모도 함께 지운다', async () => {
    await deleteGeneralSchedule('gs-1')
    const deleted = batchMock.delete.mock.calls.map((c) => pathOf(c[0]))
    expect(deleted).toEqual(expect.arrayContaining(['generalSchedules/gs-1', 'generalScheduleSeventyNotes/gs-1']))
  })
})

