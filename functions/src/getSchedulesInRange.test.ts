import { describe, expect, it, vi } from 'vitest'

vi.mock('firebase-admin', () => ({ firestore: vi.fn() }))
vi.mock('firebase-functions/v2/https', () => ({ onCall: (_o: unknown, h: unknown) => h, HttpsError: Error }))

import { scopedSchedules } from './getSchedulesInRange'

type Doc = { id: string; date: string; seventyUid?: string; unitId?: string }
type Cond = [string, string, unknown]

/** where 조건을 그대로 걸러 주는 가짜 schedules 컬렉션. failIn이면 `in` 질의가 인덱스 오류를 낸다 */
function fakeDb(docs: Doc[], opts: { failIn?: boolean } = {}) {
  const calls: Cond[][] = []
  const query = (conds: Cond[]): unknown => ({
    where: (f: string, op: string, v: unknown) => query([...conds, [f, op, v]]),
    get: async () => {
      calls.push(conds)
      if (opts.failIn && conds.some(([, op]) => op === 'in')) throw Object.assign(new Error('index'), { code: 9 })
      const hit = docs.filter((d) =>
        conds.every(([f, op, v]) => {
          const x = (d as Record<string, unknown>)[f] as string
          if (op === '==') return x === v
          if (op === 'in') return (v as string[]).includes(x)
          if (op === '>=') return x >= (v as string)
          if (op === '<=') return x <= (v as string)
          return false
        }),
      )
      return { docs: hit.map((d) => ({ id: d.id, data: () => d })) }
    },
  })
  return { db: { collection: () => query([]) } as unknown as FirebaseFirestore.Firestore, calls }
}

const docs: Doc[] = [
  { id: 'mine', date: '2027-01-10', seventyUid: 's1', unitId: 'u1' }, // 두 조건 다
  { id: 'myUnit', date: '2027-01-17', seventyUid: 's2', unitId: 'u1' },
  { id: 'elsewhere', date: '2027-01-17', seventyUid: 's1', unitId: 'zz' },
  { id: 'other', date: '2027-01-17', seventyUid: 's2', unitId: 'u9' },
  { id: 'old', date: '2026-01-01', seventyUid: 's1', unitId: 'u1' },
]

describe('scopedSchedules', () => {
  it('returns the seventy’s and their units’ schedules in range, once each', async () => {
    const { db } = fakeDb(docs)
    const got = await scopedSchedules(db, 's1', ['u1'], '2027-01-01', '2027-12-31')
    expect(got.map((s) => s.id).sort()).toEqual(['elsewhere', 'mine', 'myUnit'])
  })

  it('splits unit ids into groups of 30 for the in query', async () => {
    const { db, calls } = fakeDb(docs)
    const units = Array.from({ length: 31 }, (_, i) => `u${i}`)
    await scopedSchedules(db, 's1', units, '2027-01-01', '2027-12-31')
    const inSizes = calls.flatMap((c) => c.filter(([, op]) => op === 'in').map(([, , v]) => (v as string[]).length))
    expect(inSizes).toEqual([30, 1])
  })

  it('falls back to reading the range when the unit index is not ready', async () => {
    const { db } = fakeDb(docs, { failIn: true })
    const got = await scopedSchedules(db, 's1', ['u1'], '2027-01-01', '2027-12-31')
    expect(got.map((s) => s.id).sort()).toEqual(['elsewhere', 'mine', 'myUnit'])
  })
})
