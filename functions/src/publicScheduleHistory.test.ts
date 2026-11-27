import { describe, it, expect } from 'vitest'
import { buildPublicScheduleHistory, HISTORY_PAGE_SIZE, isHistoryDate } from './publicScheduleHistory'
import type { FirestoreLike } from './publicSchedulePayload'

type Doc = { id: string; data: () => Record<string, unknown> }

/** where(==, <, >=, in)·orderBy·limit을 실제로 적용하는 가짜 쿼리. 쪽 나눔을 검사하려면 필요하다. */
function query(docs: Doc[]) {
  const filters: Array<(d: Record<string, unknown>) => boolean> = []
  let order: { field: string; dir: string } | null = null
  let max = Infinity
  const q: Record<string, unknown> = {}
  q.where = (field: string, op: string, value: unknown) => {
    filters.push((d) => {
      const v = d[field] as string
      if (op === '==') return v === value
      if (op === '<') return v < (value as string)
      if (op === '>=') return v >= (value as string)
      if (op === 'in') return (value as unknown[]).includes(v)
      throw new Error(`unsupported op ${op}`)
    })
    return q
  }
  q.orderBy = (field: string, dir = 'asc') => {
    order = { field, dir }
    return q
  }
  q.limit = (n: number) => {
    max = n
    return q
  }
  q.get = async () => {
    let out = docs.filter((d) => filters.every((f) => f(d.data())))
    if (order) {
      const { field, dir } = order
      out = [...out].sort((a, b) => {
        const c = String(a.data()[field]).localeCompare(String(b.data()[field]))
        return dir === 'desc' ? -c : c
      })
    }
    return { docs: out.slice(0, max) }
  }
  return q
}

function setup(opts: {
  scope: string
  schedules?: Doc[]
  generals?: Doc[]
  seventyNotes?: Doc[]
}): FirestoreLike {
  const docs: Record<string, unknown> = {
    'settings/publicTokens': { tok: opts.scope },
    'settings/public': { schedulePublic: true },
    'settings/publicUnits': { [opts.scope]: { enabled: true } },
  }
  return {
    doc: (path: string) => ({ get: async () => ({ exists: path in docs, data: () => docs[path] as never }) }),
    collection: (name: string) =>
      query(
        name === 'schedules'
          ? (opts.schedules ?? [])
          : name === 'generalSchedules'
            ? (opts.generals ?? [])
            : name === 'scheduleSeventyNotes'
              ? (opts.seventyNotes ?? [])
              : [],
      ) as never,
  }
}

const visit = (id: string, date: string, extra: Record<string, unknown> = {}): Doc => ({
  id,
  data: () => ({
    type: 'ward_visit',
    unitId: 'seoul-east-stake',
    date,
    startTime: '10:00',
    endTime: '12:00',
    status: 'confirmed',
    ...extra,
  }),
})

const event = (id: string, date: string): Doc => ({
  id,
  data: () => ({ title: id, date, category: 'other', isPublic: true }),
})

/** before에서 시작해 nextBefore가 null이 될 때까지 따라가며 모든 쪽을 모은다. */
async function readAll(db: FirestoreLike, before: string) {
  const pages = []
  let cursor: string | null = before
  while (cursor !== null) {
    const page = await buildPublicScheduleHistory(db, 'tok', cursor)
    pages.push(page)
    if (page.nextBefore !== null) expect(page.nextBefore < cursor).toBe(true)
    cursor = page.nextBefore
    if (pages.length > 50) throw new Error('did not terminate')
  }
  return pages
}

describe('buildPublicScheduleHistory', () => {
  it('before보다 이른 일정과 행사를 최신순으로 한 쪽만 돌려준다', async () => {
    const schedules = Array.from({ length: 8 }, (_, i) => visit(`s${i}`, `2026-01-${String(10 + i).padStart(2, '0')}`))
    const generals = Array.from({ length: 8 }, (_, i) => event(`g${i}`, `2026-02-${String(10 + i).padStart(2, '0')}`))
    const db = setup({ scope: '__all__', schedules, generals })

    const page = await buildPublicScheduleHistory(db, 'tok', '2026-02-16')

    // 2/16은 제외 → 행사 g0~g5(2/10~2/15) 6개 + 일정 중 최신 4개
    expect(page.generalSchedules.map((g) => g.id)).toEqual(['g0', 'g1', 'g2', 'g3', 'g4', 'g5'])
    expect(page.schedules.map((s) => s.id)).toEqual(['s4', 's5', 's6', 's7'])
    expect(page.nextBefore).toBe('2026-01-14')
  })

  it('잘린 자리의 날짜는 통째로 넣어 같은 날 일정이 두 쪽에 나뉘지 않는다', async () => {
    const schedules = [
      ...Array.from({ length: 9 }, (_, i) => visit(`a${i}`, `2026-03-${String(20 + i).padStart(2, '0')}`)),
      ...Array.from({ length: 5 }, (_, i) => visit(`same${i}`, '2026-03-10')),
      visit('old', '2026-03-01'),
    ]
    const db = setup({ scope: '__all__', schedules })

    const page = await buildPublicScheduleHistory(db, 'tok', '2026-04-01')

    expect(page.schedules).toHaveLength(9 + 5)
    expect(page.nextBefore).toBe('2026-03-10')
    const next = await buildPublicScheduleHistory(db, 'tok', page.nextBefore!)
    expect(next.schedules.map((s) => s.id)).toEqual(['old'])
    expect(next.nextBefore).toBeNull()
  })

  it('한 날짜에 한 번에 읽는 양보다 많은 일정이 있어도 빠짐없이, 끝나게 읽는다', async () => {
    const schedules = [
      ...Array.from({ length: 45 }, (_, i) => visit(`busy${i}`, '2026-05-05')),
      ...Array.from({ length: 3 }, (_, i) => visit(`early${i}`, `2026-05-0${i + 1}`)),
    ]
    const db = setup({ scope: '__all__', schedules })

    const pages = await readAll(db, '2026-06-01')
    const ids = pages.flatMap((p) => p.schedules.map((s) => s.id))

    expect(new Set(ids).size).toBe(48)
    expect(ids).toHaveLength(48)
  })

  it('지역 링크는 걸러지는 접견이 많아도 와드 방문을 이어서 찾는다', async () => {
    const interviews = Array.from({ length: 80 }, (_, i) =>
      visit(`iv${i}`, `2026-07-${String((i % 28) + 1).padStart(2, '0')}`, { type: 'interview' }),
    )
    const db = setup({
      scope: 'seoul-east-stake',
      schedules: [...interviews, visit('v1', '2026-06-15'), visit('v2', '2026-06-10')],
    })

    const pages = await readAll(db, '2026-08-01')
    const ids = pages.flatMap((p) => p.schedules.map((s) => s.id))

    expect(ids.sort()).toEqual(['v1', 'v2'])
    expect(pages.at(-1)!.nextBefore).toBeNull()
  })

  it('전체를 쪽마다 따라가면 모든 항목이 정확히 한 번씩 나온다', async () => {
    const schedules = Array.from({ length: 37 }, (_, i) => visit(`s${i}`, `2025-${String((i % 12) + 1).padStart(2, '0')}-0${(i % 3) + 1}`))
    const generals = Array.from({ length: 23 }, (_, i) => event(`g${i}`, `2025-${String((i % 12) + 1).padStart(2, '0')}-0${(i % 4) + 1}`))
    const db = setup({ scope: '__all__', schedules, generals })

    const pages = await readAll(db, '2026-01-01')
    const ids = pages.flatMap((p) => [...p.schedules.map((s) => s.id), ...p.generalSchedules.map((g) => g.id)])

    expect(ids).toHaveLength(60)
    expect(new Set(ids).size).toBe(60)
    for (const p of pages.slice(0, -1)) {
      expect(p.schedules.length + p.generalSchedules.length).toBeGreaterThanOrEqual(HISTORY_PAGE_SIZE)
    }
  })

  it('지역 링크에는 칠십인 전용 메모를 싣지 않고, 전체 공유에는 싣는다', async () => {
    const notes = [{ id: 's1', data: () => ({ date: '2026-01-05', notes: '비공개 메모' }) }]
    const schedules = [visit('s1', '2026-01-05')]

    const all = await buildPublicScheduleHistory(setup({ scope: '__all__', schedules, seventyNotes: notes }), 'tok', '2026-02-01')
    expect(all.schedules[0].seventyNotes).toBe('비공개 메모')

    const scoped = await buildPublicScheduleHistory(
      setup({ scope: 'seoul-east-stake', schedules, seventyNotes: notes }),
      'tok',
      '2026-02-01',
    )
    expect(scoped.schedules[0].seventyNotes).toBeUndefined()
  })

  it('칠십인 개인 링크는 그 칠십인의 일정만 이어 준다', async () => {
    const db = setup({
      scope: 'seventy:u1',
      schedules: [
        visit('a', '2026-01-10', { seventyUid: 'u1' }),
        visit('b', '2026-01-03', { seventyUid: 'u1' }),
        visit('c', '2026-01-05', { seventyUid: 'u2' }),
        visit('d', '2026-01-06'),
      ],
    })

    const pages = await readAll(db, '2026-02-01')

    expect(pages.flatMap((p) => p.schedules.map((s) => s.id)).sort()).toEqual(['a', 'b'])
  })

  it('알 수 없는 토큰은 처음 페이지와 같이 거부한다', async () => {
    const db = setup({ scope: '__all__' })
    await expect(buildPublicScheduleHistory(db, 'nope', '2026-01-01')).rejects.toMatchObject({
      reason: 'invalid-token',
    })
  })
})

describe('isHistoryDate', () => {
  it('YYYY-MM-DD 형식의 실제 날짜만 받는다', () => {
    expect(isHistoryDate('2026-01-31')).toBe(true)
    expect(isHistoryDate('2026-1-31')).toBe(false)
    expect(isHistoryDate('2026-13-01')).toBe(false)
    expect(isHistoryDate(undefined)).toBe(false)
    expect(isHistoryDate("2026-01-01' OR 1")).toBe(false)
  })
})
