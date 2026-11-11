import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPublicSchedulePayload, type FirestoreLike } from './publicSchedulePayload'

function snap(data: unknown, exists = true) {
  return { exists, data: () => data }
}

/** where/orderBy를 몇 번 체이닝하든 같은 객체를 돌려주고, get()이 docs를 낸다. */
function query(docs: Array<{ id: string; data: () => unknown }>) {
  // '==' 조건만 실제로 걸러낸다 — isPublic/seventyOnly처럼 "어느 쿼리가 무엇을 읽는가"가
  // 판정의 일부인 경우를 검사하려면 필요하다. in·>= 조건은 예전처럼 통과시킨다.
  const filters: Array<[string, unknown]> = []
  const q: Record<string, unknown> = {}
  q.where = (field: string, op: string, value: unknown) => {
    if (op === '==') filters.push([field, value])
    return q
  }
  q.orderBy = () => q
  q.get = async () => ({
    docs: docs.filter((d) =>
      filters.every(([field, value]) => (d.data() as Record<string, unknown>)[field] === value),
    ),
  })
  return q
}

// firebase-admin은 설치돼 있지 않고(vi.mock으로도 모듈을 만들 수 없다) FirestoreLike는
// 이 테스트가 쓰는 표면만 있으면 되므로, 손으로 세운 가짜를 그대로 db로 주입한다.
function setupFirestore(opts: {
  tokens?: Record<string, string>
  publicSettings?: Record<string, unknown>
  units?: Record<string, unknown>
  schedules?: Array<{ id: string; data: () => unknown }>
  generals?: Array<{ id: string; data: () => unknown }>
  seventyNotes?: Array<{ id: string; data: () => unknown }>
  generalSeventyNotes?: Array<{ id: string; data: () => unknown }>
}): FirestoreLike {
  const docMock = vi.fn((path: string) => ({
    get: async () => {
      if (path === 'settings/publicTokens') return snap(opts.tokens ?? {}, !!opts.tokens)
      if (path === 'settings/public') return snap(opts.publicSettings ?? { schedulePublic: true })
      if (path === 'settings/publicUnits') return snap(opts.units ?? {}, !!opts.units)
      throw new Error(`unexpected doc ${path}`)
    },
  }))
  const collectionMock = vi.fn((name: string) =>
    query(
      name === 'schedules'
        ? (opts.schedules ?? [])
        : name === 'scheduleSeventyNotes'
          ? (opts.seventyNotes ?? [])
          : name === 'generalScheduleSeventyNotes'
            ? (opts.generalSeventyNotes ?? [])
            : (opts.generals ?? []),
    ),
  )
  return { doc: docMock, collection: collectionMock }
}

describe('buildPublicSchedulePayload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('알 수 없는 토큰은 invalid-token으로 거부한다', async () => {
    const db = setupFirestore({ tokens: {} })
    await expect(buildPublicSchedulePayload(db, 'nope')).rejects.toMatchObject({
      reason: 'invalid-token',
    })
  })

  it('공개 설정이 꺼져 있으면 not-enabled로 거부한다', async () => {
    const db = setupFirestore({
      tokens: { tok: '__all__' },
      publicSettings: { schedulePublic: false },
    })
    await expect(buildPublicSchedulePayload(db, 'tok')).rejects.toMatchObject({
      reason: 'not-enabled',
    })
  })

  // 전역 schedulePublic은 켜져 있지만 이 토큰이 가리키는 특정 유닛/CC 링크만 꺼진 경우.
  // 'not-enabled'(전체가 꺼짐)와 구분되는 별개의 reason이어야 한다 — 합치면 나중에 이
  // 링크가 왜 막혔는지 디버깅할 수 없다.
  it('특정 유닛/CC 링크가 꺼져 있으면 scope-not-enabled로 거부한다', async () => {
    const db = setupFirestore({
      tokens: { tok: 'seoul-east-stake' },
      units: { 'seoul-east-stake': { enabled: false } },
    })
    await expect(buildPublicSchedulePayload(db, 'tok')).rejects.toMatchObject({
      reason: 'scope-not-enabled',
    })
  })

  it('settings/publicUnits에 항목 자체가 없어도 scope-not-enabled로 거부한다', async () => {
    const db = setupFirestore({
      tokens: { tok: 'seoul-east-stake' },
      // units를 아예 지정하지 않으면 settings/publicUnits 문서가 exists:false로 잡힌다.
    })
    await expect(buildPublicSchedulePayload(db, 'tok')).rejects.toMatchObject({
      reason: 'scope-not-enabled',
    })
  })

  it('전체 공유 토큰은 확정 일정을 그대로 내보내고 scopeDisplayName이 null이다', async () => {
    const db = setupFirestore({
      tokens: { tok: '__all__' },
      schedules: [
        {
          id: 's1',
          data: () => ({
            type: 'ward_visit',
            unitId: 'seoul-east-stake',
            date: '2026-09-10',
            startTime: '10:00',
            endTime: '12:00',
            status: 'confirmed',
            wardName: '교문 와드',
          }),
        },
      ],
    })
    const payload = await buildPublicSchedulePayload(db, 'tok')
    expect(payload.scopeDisplayName).toBeNull()
    expect(payload.schedules).toHaveLength(1)
    expect(payload.schedules[0]).toMatchObject({ id: 's1', wardName: '교문 와드' })
  })

  describe('칠십인 전용', () => {
    const general = (id: string, extra: Record<string, unknown>) => ({
      id,
      data: () => ({ title: id, date: '2999-01-0' + id.slice(-1), category: 'other', ...extra }),
    })
    const generals = [
      general('g1', { isPublic: true, seventyOnly: false }),
      general('g2', { isPublic: false, seventyOnly: true }),
      general('g3', { isPublic: false, seventyOnly: false }),
    ]

    it('전체 공유 토큰은 공개 행사와 칠십인 전용 행사를 함께 내보낸다', async () => {
      const db = setupFirestore({ tokens: { tok: '__all__' }, generals })
      const payload = await buildPublicSchedulePayload(db, 'tok')
      expect(payload.generalSchedules.map((g) => g.id)).toEqual(['g1', 'g2'])
    })

    it('유닛 링크는 칠십인 전용 행사를 내보내지 않는다', async () => {
      const db = setupFirestore({
        tokens: { tok: 'seoul-east-stake' },
        units: { 'seoul-east-stake': { enabled: true } },
        generals,
      })
      const payload = await buildPublicSchedulePayload(db, 'tok')
      expect(payload.generalSchedules.map((g) => g.id)).toEqual(['g1'])
    })
  })

  // 칠십인 전용 메모는 일정 문서가 아니라 별도 컬렉션에 있다. 칠십인 전용 페이지(전체 공유)에만
  // 붙여 내보내고, CC·유닛 링크에는 절대 싣지 않는다.
  describe('칠십인 전용 메모', () => {
    const visit = {
      id: 's1',
      data: () => ({
        type: 'ward_visit', unitId: 'seoul-east-stake', date: '2999-09-10',
        startTime: '10:00', endTime: '12:00', status: 'confirmed', notes: '일반 메모',
      }),
    }
    const seventyNotes = [{ id: 's1', data: () => ({ seventyUid: 'sv', date: '2999-09-10', notes: '전용 메모' }) }]

    it('전체 공유 토큰은 일정에 칠십인 전용 메모를 붙여 내보낸다', async () => {
      const db = setupFirestore({ tokens: { tok: '__all__' }, schedules: [visit], seventyNotes })
      const payload = await buildPublicSchedulePayload(db, 'tok')
      expect(payload.schedules[0]).toMatchObject({ notes: '일반 메모', seventyNotes: '전용 메모' })
    })

    it('유닛 링크는 칠십인 전용 메모를 내보내지 않는다', async () => {
      const db = setupFirestore({
        tokens: { tok: 'seoul-east-stake' },
        units: { 'seoul-east-stake': { enabled: true } },
        schedules: [visit],
        seventyNotes,
      })
      const payload = await buildPublicSchedulePayload(db, 'tok')
      expect(payload.schedules).toHaveLength(1)
      expect(payload.schedules[0]).not.toHaveProperty('seventyNotes')
      expect(payload.schedules[0].notes).toBe('일반 메모')
    })
  })

  // 행사의 칠십인 전용 메모도 같은 규칙이다 — 칠십인 전용 페이지에만 붙여 내보낸다.
  describe('행사의 칠십인 전용 메모', () => {
    const generals = [
      { id: 'g1', data: () => ({ title: '대회', date: '2999-01-01', category: 'conference', isPublic: true, seventyOnly: false }) },
    ]
    const generalSeventyNotes = [{ id: 'g1', data: () => ({ date: '2999-01-01', notes: '행사 전용 메모' }) }]

    it('전체 공유 토큰은 행사에 칠십인 전용 메모를 붙여 내보낸다', async () => {
      const db = setupFirestore({ tokens: { tok: '__all__' }, generals, generalSeventyNotes })
      const payload = await buildPublicSchedulePayload(db, 'tok')
      expect(payload.generalSchedules[0]).toMatchObject({ id: 'g1', seventyNotes: '행사 전용 메모' })
    })

    it('유닛 링크는 행사의 칠십인 전용 메모를 내보내지 않는다', async () => {
      const db = setupFirestore({
        tokens: { tok: 'seoul-east-stake' },
        units: { 'seoul-east-stake': { enabled: true } },
        generals,
        generalSeventyNotes,
      })
      const payload = await buildPublicSchedulePayload(db, 'tok')
      expect(payload.generalSchedules).toHaveLength(1)
      expect(payload.generalSchedules[0]).not.toHaveProperty('seventyNotes')
    })
  })
})
