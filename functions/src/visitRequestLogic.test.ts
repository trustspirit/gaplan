import { describe, it, expect } from 'vitest'
import {
  validateRecommendation,
  publicVisitRequestView,
  checkDecision,
  conflictingVisitId,
  decisionScheduleId,
  wardVisitStats,
  type VisitRequestDoc,
} from './visitRequestLogic'

function request(partial: Partial<VisitRequestDoc> = {}): VisitRequestDoc {
  return {
    title: '1월 와드 방문',
    seventyUid: 's1',
    seventyName: '김칠십',
    sundays: ['2027-01-10', '2027-01-17'],
    status: 'open',
    units: [
      {
        id: 'seoul-stake', ko: '서울 스테이크', en: 'Seoul Stake',
        wards: [
          { id: 'seoul-nokbeon', ko: '녹번 와드', en: 'Nokbeon Ward' },
          { id: 'seoul-sinchon', ko: '신촌 와드', en: 'Sinchon Ward' },
        ],
      },
      {
        id: 'seoul-east-stake', ko: '서울동 스테이크', en: 'Seoul East Stake',
        wards: [{ id: 'seoul-east-gyomun', ko: '교문 와드', en: 'Gyomun Ward' }],
      },
    ],
    decisions: {},
    ...partial,
  }
}

const base = { unitId: 'seoul-stake', submitterName: '홍길동 회장' }

describe('validateRecommendation', () => {
  it('정리된 추천을 날짜순으로 돌려주고 와드 이름은 요청의 스냅샷에서 채운다', () => {
    const r = validateRecommendation(request(), {
      ...base,
      picks: [
        { date: '2027-01-17', wardId: 'seoul-sinchon' },
        { date: '2027-01-10', wardId: 'seoul-nokbeon' },
      ],
    })
    expect(r).toEqual({
      ok: true,
      submitterName: '홍길동 회장',
      note: '',
      picks: [
        { date: '2027-01-10', wardId: 'seoul-nokbeon', wardName: '녹번 와드' },
        { date: '2027-01-17', wardId: 'seoul-sinchon', wardName: '신촌 와드' },
      ],
    })
  })

  it('빈 추천은 "이번엔 추천 없음"으로 받아들인다', () => {
    const r = validateRecommendation(request(), { ...base, picks: [] })
    expect(r.ok).toBe(true)
  })

  it('마감된 요청은 받지 않는다', () => {
    const r = validateRecommendation(request({ status: 'closed' }), { ...base, picks: [] })
    expect(r).toMatchObject({ ok: false, code: 'failed-precondition' })
  })

  it('요청에 없는 스테이크는 거절한다', () => {
    const r = validateRecommendation(request(), { ...base, unitId: 'busan-stake', picks: [] })
    expect(r).toMatchObject({ ok: false, code: 'invalid-argument' })
  })

  it('다른 스테이크의 와드는 거절한다 — 공개 링크에서 남의 와드를 끼워 넣지 못한다', () => {
    const r = validateRecommendation(request(), {
      ...base,
      picks: [{ date: '2027-01-10', wardId: 'seoul-east-gyomun' }],
    })
    expect(r).toMatchObject({ ok: false, code: 'invalid-argument' })
  })

  it('요청의 일요일이 아닌 날짜는 거절한다', () => {
    const r = validateRecommendation(request(), {
      ...base,
      picks: [{ date: '2027-01-24', wardId: 'seoul-nokbeon' }],
    })
    expect(r).toMatchObject({ ok: false, code: 'invalid-argument' })
  })

  it('한 일요일에 와드 둘을 추천하면 거절한다', () => {
    const r = validateRecommendation(request(), {
      ...base,
      picks: [
        { date: '2027-01-10', wardId: 'seoul-nokbeon' },
        { date: '2027-01-10', wardId: 'seoul-sinchon' },
      ],
    })
    expect(r).toMatchObject({ ok: false, code: 'invalid-argument' })
  })

  it('이름이 비었거나 너무 길면 거절한다', () => {
    expect(validateRecommendation(request(), { ...base, submitterName: '  ', picks: [] }).ok).toBe(false)
    expect(
      validateRecommendation(request(), { ...base, submitterName: 'x'.repeat(41), picks: [] }).ok,
    ).toBe(false)
  })

  it('다른 스테이크로 확정된 일요일에는 추천할 수 없지만, 자기 와드로 확정된 날은 다시 낼 수 있다', () => {
    const decided = request({
      decisions: {
        '2027-01-10': { unitId: 'seoul-east-stake', wardId: 'seoul-east-gyomun', wardName: '교문 와드', scheduleId: 'x' },
        '2027-01-17': { unitId: 'seoul-stake', wardId: 'seoul-sinchon', wardName: '신촌 와드', scheduleId: 'y' },
      },
    })
    expect(
      validateRecommendation(decided, { ...base, picks: [{ date: '2027-01-10', wardId: 'seoul-nokbeon' }] }),
    ).toMatchObject({ ok: false, code: 'failed-precondition' })
    expect(
      validateRecommendation(decided, { ...base, picks: [{ date: '2027-01-17', wardId: 'seoul-sinchon' }] }).ok,
    ).toBe(true)
  })
})

describe('publicVisitRequestView', () => {
  it('토큰·칠십인 uid·일정 id 같은 내부 값을 내보내지 않는다', () => {
    const view = publicVisitRequestView(
      {
        ...request({
          decisions: {
            '2027-01-10': { unitId: 'seoul-stake', wardId: 'seoul-nokbeon', wardName: '녹번 와드', scheduleId: 'vr_secret' },
          },
        }),
        token: 'abc',
        createdBy: 'admin-uid',
      } as VisitRequestDoc,
      [],
    )
    const json = JSON.stringify(view)
    expect(json).not.toContain('vr_secret')
    expect(json).not.toContain('admin-uid')
    expect(json).not.toContain('"s1"')
    expect(view.decisions['2027-01-10']).toEqual({ unitId: 'seoul-stake', wardId: 'seoul-nokbeon', wardName: '녹번 와드' })
  })

  it('open이 아닌 상태는 모두 closed로 보인다', () => {
    expect(publicVisitRequestView(request({ status: 'weird' }), []).status).toBe('closed')
  })
})

describe('checkDecision', () => {
  it('요청 범위 안의 와드면 통과한다(추천받지 않은 와드라도)', () => {
    const r = checkDecision(request(), { date: '2027-01-10', unitId: 'seoul-stake', wardId: 'seoul-sinchon' })
    expect(r).toMatchObject({ ok: true, ward: { ko: '신촌 와드' } })
  })

  it('요청에 없는 일요일·스테이크·와드는 거절한다', () => {
    expect(checkDecision(request(), { date: '2027-02-07', unitId: 'seoul-stake', wardId: 'seoul-sinchon' }).ok).toBe(false)
    expect(checkDecision(request(), { date: '2027-01-10', unitId: 'busan-stake', wardId: 'seoul-sinchon' }).ok).toBe(false)
    expect(checkDecision(request(), { date: '2027-01-10', unitId: 'seoul-stake', wardId: 'seoul-east-gyomun' }).ok).toBe(false)
  })
})

describe('conflictingVisitId', () => {
  const own = decisionScheduleId('r1', '2027-01-10')

  it('같은 날 다른 와드 방문이 있으면 그 id를 돌려준다', () => {
    expect(conflictingVisitId([{ id: 'other', type: 'ward_visit', status: 'confirmed' }], own)).toBe('other')
  })

  it('자기 일정·취소된 일정·방문이 아닌 일정은 겹침이 아니다', () => {
    expect(
      conflictingVisitId(
        [
          { id: own, type: 'ward_visit', status: 'confirmed' },
          { id: 'c', type: 'ward_visit', status: 'cancelled' },
          { id: 'i', type: 'interview', status: 'confirmed' },
        ],
        own,
      ),
    ).toBeNull()
  })
})

describe('wardVisitStats', () => {
  const units = request().units!
  const today = '2026-11-15'

  it('지난 방문·다음 방문·최근 12개월 횟수를 와드별로 낸다', () => {
    const stats = wardVisitStats(units, [
      { type: 'ward_visit', status: 'confirmed', unitId: 'seoul-stake', wardId: 'seoul-nokbeon', date: '2026-03-01' },
      { type: 'ward_visit', status: 'confirmed', unitId: 'seoul-stake', wardId: 'seoul-nokbeon', date: '2026-09-06' },
      { type: 'ward_visit', status: 'confirmed', unitId: 'seoul-stake', wardId: 'seoul-nokbeon', date: '2025-10-05' },
      { type: 'ward_visit', status: 'pending', unitId: 'seoul-stake', wardId: 'seoul-nokbeon', date: '2026-12-06' },
    ], today)
    expect(stats['seoul-nokbeon']).toEqual({ lastVisit: '2026-09-06', nextVisit: '2026-12-06', count12m: 2 })
    expect(stats['seoul-sinchon']).toEqual({ lastVisit: null, nextVisit: null, count12m: 0 })
  })

  it('wardId가 없는 옛 일정은 같은 스테이크 안의 와드 이름으로 맞춘다', () => {
    const stats = wardVisitStats(units, [
      { type: 'ward_visit', status: 'confirmed', unitId: 'seoul-stake', wardName: '신촌 와드', date: '2026-10-04' },
      // 다른 스테이크의 같은 이름은 세지 않는다
      { type: 'ward_visit', status: 'confirmed', unitId: 'busan-stake', wardName: '녹번 와드', date: '2026-10-11' },
    ], today)
    expect(stats['seoul-sinchon'].lastVisit).toBe('2026-10-04')
    expect(stats['seoul-nokbeon'].lastVisit).toBeNull()
  })

  it('취소된 일정과 방문이 아닌 일정은 세지 않는다', () => {
    const stats = wardVisitStats(units, [
      { type: 'ward_visit', status: 'cancelled', unitId: 'seoul-stake', wardId: 'seoul-nokbeon', date: '2026-10-04' },
      { type: 'interview', status: 'confirmed', unitId: 'seoul-stake', wardId: 'seoul-nokbeon', date: '2026-10-04' },
    ], today)
    expect(stats['seoul-nokbeon'].lastVisit).toBeNull()
  })
})
