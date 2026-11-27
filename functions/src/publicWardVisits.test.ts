import { describe, it, expect } from 'vitest'
import { buildPublicWardVisits, isWardVisitYear } from './publicWardVisits'
import type { FirestoreLike } from './publicSchedulePayload'

type Doc = { id: string; data: () => Record<string, unknown> }

/** where(==, >=, <=)·orderBy를 실제로 적용하는 가짜 쿼리. */
function query(docs: Doc[]) {
  const filters: Array<(d: Record<string, unknown>) => boolean> = []
  let order: { field: string; dir: string } | null = null
  const q: Record<string, unknown> = {}
  q.where = (field: string, op: string, value: unknown) => {
    filters.push((d) => {
      const v = d[field] as string
      if (op === '==') return v === value
      if (op === '>=') return v >= (value as string)
      if (op === '<=') return v <= (value as string)
      throw new Error(`unsupported op ${op}`)
    })
    return q
  }
  q.orderBy = (field: string, dir = 'asc') => {
    order = { field, dir }
    return q
  }
  q.limit = () => q
  q.get = async () => {
    let out = docs.filter((d) => filters.every((f) => f(d.data())))
    if (order) {
      const { field, dir } = order
      out = [...out].sort((a, b) => {
        const c = String(a.data()[field]).localeCompare(String(b.data()[field]))
        return dir === 'desc' ? -c : c
      })
    }
    return { docs: out }
  }
  return q
}

function setup(scope: string, schedules: Doc[]): FirestoreLike {
  const docs: Record<string, unknown> = {
    'settings/publicTokens': { tok: scope },
    'settings/public': { schedulePublic: true },
    'settings/publicUnits': { [scope]: { enabled: true } },
  }
  return {
    doc: (path: string) => ({ get: async () => ({ exists: path in docs, data: () => docs[path] as never }) }),
    collection: (name: string) => query(name === 'schedules' ? schedules : []) as never,
  }
}

const sched = (id: string, date: string, seventyUid: string, type = 'ward_visit'): Doc => ({
  id,
  data: () => ({
    type,
    seventyUid,
    unitId: 'seoul-east-stake',
    wardName: '교문 와드',
    date,
    startTime: '10:00',
    endTime: '12:00',
    status: 'confirmed',
    notes: '메모',
    zoomLink: 'https://zoom.us/j/1',
  }),
})

describe('buildPublicWardVisits', () => {
  it('그 칠십인의 그해 와드 방문만 날짜순으로, 날짜·와드·유닛만 싣는다', async () => {
    const db = setup('seventy:u1', [
      sched('late', '2026-11-23', 'u1'),
      sched('early', '2026-02-08', 'u1'),
      sched('interview', '2026-03-01', 'u1', 'interview'),
      sched('lastYear', '2025-12-28', 'u1'),
      sched('other', '2026-05-03', 'u2'),
    ])

    const { visits } = await buildPublicWardVisits(db, 'tok', 2026)

    expect(visits.map((v) => v.id)).toEqual(['early', 'late'])
    expect(Object.keys(visits[0]).sort()).toEqual(['date', 'id', 'unitId', 'wardName'])
    expect(visits[0]).toEqual({ id: 'early', date: '2026-02-08', wardName: '교문 와드', unitId: 'seoul-east-stake' })
  })

  it('칠십인 개인 링크가 아니면 invalid-scope로 거부한다', async () => {
    const db = setup('__all__', [sched('a', '2026-01-04', 'u1')])
    await expect(buildPublicWardVisits(db, 'tok', 2026)).rejects.toMatchObject({ reason: 'invalid-scope' })
  })
})

describe('isWardVisitYear', () => {
  const now = new Date('2026-11-27T03:00:00Z')
  it('2000년부터 내년까지의 정수만 받는다', () => {
    expect(isWardVisitYear(2026, now)).toBe(true)
    expect(isWardVisitYear(2000, now)).toBe(true)
    expect(isWardVisitYear(2027, now)).toBe(true)
    expect(isWardVisitYear(1999, now)).toBe(false)
    expect(isWardVisitYear(2028, now)).toBe(false)
    expect(isWardVisitYear('2026', now)).toBe(false)
    expect(isWardVisitYear(2026.5, now)).toBe(false)
  })
})
