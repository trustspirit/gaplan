import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPublicSchedulePayload, PublicScopeError, type FirestoreLike } from './publicSchedulePayload'

function snap(data: unknown, exists = true) {
  return { exists, data: () => data }
}

/** where/orderBy를 몇 번 체이닝하든 같은 객체를 돌려주고, get()이 docs를 낸다. */
function query(docs: Array<{ id: string; data: () => unknown }>) {
  const q: Record<string, unknown> = {}
  q.where = () => q
  q.orderBy = () => q
  q.get = async () => ({ docs })
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
    query(name === 'schedules' ? (opts.schedules ?? []) : (opts.generals ?? [])),
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
    await expect(buildPublicSchedulePayload(db, 'tok')).rejects.toBeInstanceOf(PublicScopeError)
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
})
