import { describe, it, expect } from 'vitest'
import {
  validateRecommendation,
  publicVisitRequestView,
  checkDecision,
  conflictingVisitId,
  decisionScheduleId,
  wardVisitStats,
  trustedUnits,
  staleDecisionDate,
  tokenMatches,
  unitIdForToken,
  publicSundayStatusForUnit,
  sundaysForUnit,
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
  it('다른 CC 차례인 일요일은 받지 않는다', () => {
    const req = request({
      sundayRegions: { '2027-01-10': 'seoul', '2027-01-17': 'seoul-south' },
      units: request().units!.map((u) => ({ ...u, regionId: 'seoul' })),
    })
    expect(validateRecommendation(req, { ...base, picks: [{ date: '2027-01-10', wardId: 'seoul-nokbeon' }] }).ok).toBe(true)
    expect(validateRecommendation(req, { ...base, picks: [{ date: '2027-01-17', wardId: 'seoul-nokbeon' }] })).toEqual({
      ok: false, code: 'failed-precondition', message: '2027-01-17 is for another CC',
    })
  })

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
      note: null,
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

  it('이름 없이도 받는다 — 링크가 스테이크마다 따로라 누가 냈는지는 정해져 있다', () => {
    expect(validateRecommendation(request(), { unitId: 'seoul-stake', picks: [] })).toMatchObject({ ok: true, submitterName: '' })
    expect(validateRecommendation(request(), { ...base, submitterName: '  ', picks: [] })).toMatchObject({ ok: true, submitterName: '' })
  })

  it('예전 화면이 보낸 이름이 너무 길면 거절한다', () => {
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
      'seoul-stake',
    )
    const json = JSON.stringify(view)
    expect(json).not.toContain('vr_secret')
    expect(json).not.toContain('admin-uid')
    expect(json).not.toContain('"s1"')
    expect(view.decisions['2027-01-10']).toEqual({ unitId: 'seoul-stake', wardId: 'seoul-nokbeon', wardName: '녹번 와드' })
  })

  it('추천 배정의 1순위·예비 구분은 회장에게 보내지 않는다', () => {
    const view = publicVisitRequestView(
      request({
        unitSundays: { 'seoul-stake': ['2027-01-10'] },
        unitSundayRoles: { '2027-01-10': { primary: 'seoul-stake', backup: 'seoul-east-stake' } },
      }),
      [],
      'seoul-stake',
    )
    expect(Object.keys(view)).not.toContain('unitSundayRoles')
    expect(JSON.stringify(view)).not.toContain('primary')
  })

  it('open이 아닌 상태는 모두 closed로 보인다', () => {
    expect(publicVisitRequestView(request({ status: 'weird' }), [], 'seoul-stake').status).toBe('closed')
  })

  it('링크가 연 스테이크만 보이고, 다른 스테이크의 추천·확정 와드는 감춘다', () => {
    const view = publicVisitRequestView(
      request({
        decisions: {
          '2027-01-10': { unitId: 'seoul-east-stake', wardId: 'seoul-east-gyomun', wardName: '교문 와드', scheduleId: 'x' },
          '2027-01-17': { unitId: 'seoul-stake', wardId: 'seoul-nokbeon', wardName: '녹번 와드', scheduleId: 'y' },
        },
      }),
      [
        { unitId: 'seoul-stake', submitterName: 'A', note: '', picks: [], submittedAt: 'x' },
        { unitId: 'seoul-east-stake', submitterName: 'B', note: '', picks: [], submittedAt: 'x' },
      ],
      'seoul-stake',
    )
    expect(view.units.map((u) => u.id)).toEqual(['seoul-stake'])
    expect(view.recommendations.map((r) => r.unitId)).toEqual(['seoul-stake'])
    expect(view.decisions['2027-01-10']).toEqual({ unitId: '', wardId: '', wardName: '' })
    expect(view.decisions['2027-01-17'].wardName).toBe('녹번 와드')
    const json = JSON.stringify(view)
    expect(json).not.toContain('교문')
    expect(json).not.toContain('서울동')
  })
})

describe('sundaysForUnit', () => {
  it('고른 일요일이 없으면 요청의 모든 일요일, 있으면 그중 요청에 있는 것만', () => {
    expect(sundaysForUnit(request(), 'seoul-stake')).toEqual(['2027-01-10', '2027-01-17'])
    const req = request({ unitSundays: { 'seoul-stake': ['2027-01-17', '2099-01-01'] } })
    expect(sundaysForUnit(req, 'seoul-stake')).toEqual(['2027-01-17'])
    expect(sundaysForUnit(req, 'seoul-east-stake')).toEqual(['2027-01-10', '2027-01-17'])
  })

  it('그 스테이크 CC 차례가 아닌 일요일은 고른 것이라도 뺀다', () => {
    const req = request({
      units: request().units!.map((u) => ({ ...u, regionId: u.id === 'seoul-stake' ? 'seoul' : 'seoul-east' })),
      sundayRegions: { '2027-01-10': 'seoul', '2027-01-17': 'seoul-east' },
    })
    expect(sundaysForUnit(req, 'seoul-stake')).toEqual(['2027-01-10'])
    expect(sundaysForUnit({ ...req, unitSundays: { 'seoul-stake': ['2027-01-10', '2027-01-17'] } }, 'seoul-stake'))
      .toEqual(['2027-01-10'])
  })

  it('공개 화면에는 그 스테이크의 일요일만 보인다', () => {
    const req = request({ unitSundays: { 'seoul-stake': ['2027-01-17'] } })
    expect(publicVisitRequestView(req, [], 'seoul-stake').sundays).toEqual(['2027-01-17'])
  })
})

describe('unitIdForToken', () => {
  const tokens = { 'seoul-stake': '0123456789abcdef', 'seoul-east-stake': 'fedcba9876543210' }

  it('토큰이 여는 스테이크를 찾는다', () => {
    expect(unitIdForToken(request({ unitTokens: tokens }), 'fedcba9876543210')).toBe('seoul-east-stake')
    expect(unitIdForToken(request({ unitTokens: tokens }), 'aaaaaaaaaaaaaaaa')).toBeNull()
  })

  it('예전 공용 토큰은 받지 않는다', () => {
    const old = { ...request(), token: '0123456789abcdef' } as VisitRequestDoc
    expect(unitIdForToken(old, '0123456789abcdef')).toBeNull()
  })

  it('요청에 실리지 않은(믿을 수 없는) 스테이크의 토큰은 받지 않는다', () => {
    const req = request({ unitTokens: { 'busan-stake': '0123456789abcdef' } })
    expect(unitIdForToken(req, '0123456789abcdef')).toBeNull()
  })
})

describe('publicSundayStatusForUnit', () => {
  it('다른 스테이크의 대회·행사를 빼고 칠십인 일정 내용은 감춘다', () => {
    const out = publicSundayStatusForUnit(
      {
        '2027-01-10': {
          busy: [{ kind: 'schedule', label: '상당 와드', publicLabel: false }],
          notes: [
            { title: '지역 행사', unitIds: null },
            { title: '서울동 청소년 대회', unitIds: ['seoul-east-stake'] },
            { title: '합동 행사', unitIds: ['seoul-stake', 'seoul-east-stake'] },
          ],
          unitBlocks: { 'seoul-stake': '서울 스테이크 대회', 'seoul-east-stake': '서울동 스테이크 대회' },
        },
      },
      'seoul-stake',
    )
    expect(out['2027-01-10']).toEqual({
      busy: [{ kind: 'schedule', label: '' }],
      notes: [{ title: '지역 행사', unitIds: null }, { title: '합동 행사', unitIds: ['seoul-stake'] }],
      unitBlocks: { 'seoul-stake': '서울 스테이크 대회' },
    })
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

describe('validateRecommendation — 메모', () => {
  it('메모를 보내지 않으면 null(기존 메모 유지), 빈 문자열이면 지운다', () => {
    const keep = validateRecommendation(request(), { ...base, picks: [] })
    const clear = validateRecommendation(request(), { ...base, note: '  ', picks: [] })
    expect(keep).toMatchObject({ ok: true, note: null })
    expect(clear).toMatchObject({ ok: true, note: '' })
  })
})

describe('publicVisitRequestView — 메모', () => {
  it('다른 회장의 메모를 내보내지 않고 있는지만 알린다', () => {
    const view = publicVisitRequestView(request(), [
      { unitId: 'seoul-stake', submitterName: 'A', note: '감독 교체 예정', picks: [], submittedAt: 'x' },
    ], 'seoul-stake')
    expect(JSON.stringify(view)).not.toContain('감독 교체 예정')
    expect(view.recommendations[0].hasNote).toBe(true)
  })
})

describe('trustedUnits', () => {
  const wardUnits = {
    'seoul-nokbeon': { unitId: 'seoul-stake', ko: '녹번 와드' },
    'seoul-sinchon': { unitId: 'seoul-stake', ko: '신촌 와드' },
    'seoul-east-gyomun': { unitId: 'seoul-east-stake', ko: '교문 와드' },
  }

  it('담당 밖 스테이크를 뺀다', () => {
    const units = trustedUnits(request().units, new Set(['seoul-stake']), wardUnits)
    expect(units.map((u) => u.id)).toEqual(['seoul-stake'])
  })

  it('다른 스테이크 소속이거나 모르는 와드를 빼고, 이름은 서버 표의 것으로 바꾼다', () => {
    const forged = [{
      id: 'seoul-stake', ko: '서울 스테이크', en: 'Seoul',
      wards: [
        { id: 'seoul-nokbeon', ko: '바꾼 이름', en: 'N' },
        { id: 'seoul-east-gyomun', ko: '교문 와드', en: 'G' },
        { id: 'made-up', ko: '가짜', en: 'F' },
      ],
    }]
    const units = trustedUnits(forged, new Set(['seoul-stake']), wardUnits)
    expect(units[0].wards).toEqual([{ id: 'seoul-nokbeon', ko: '녹번 와드', en: 'N' }])
  })

  it('소속 CC는 클라이언트 값이 아니라 서버 표로 채운다', () => {
    const forged = request().units!.map((u) => ({ ...u, regionId: 'busan' }))
    const units = trustedUnits(forged, new Set(['seoul-stake']), wardUnits, { 'seoul-stake': 'seoul' })
    expect(units[0].regionId).toBe('seoul')
  })
})

describe('staleDecisionDate', () => {
  const before = { visitRequestId: 'r1', date: '2027-01-10', status: 'confirmed' }

  it('지워지거나 취소되거나 날짜가 옮겨지면 그 날짜의 확정을 거둔다', () => {
    expect(staleDecisionDate(before, undefined)).toBe('2027-01-10')
    expect(staleDecisionDate(before, { ...before, status: 'cancelled' })).toBe('2027-01-10')
    expect(staleDecisionDate(before, { ...before, date: '2027-01-17' })).toBe('2027-01-10')
  })

  it('시각만 바뀌었거나, 추천 요청 일정이 아니거나, 새로 만든 일정이면 그대로 둔다', () => {
    expect(staleDecisionDate(before, { ...before })).toBeNull()
    expect(staleDecisionDate({ date: '2027-01-10', status: 'confirmed' }, undefined)).toBeNull()
    expect(staleDecisionDate(undefined, before)).toBeNull()
  })
})

describe('tokenMatches', () => {
  it('형식이 맞고 같은 토큰만 통과한다', () => {
    expect(tokenMatches('0123456789abcdef', '0123456789abcdef')).toBe(true)
    expect(tokenMatches('0123456789abcdef', 'fedcba9876543210')).toBe(false)
    expect(tokenMatches(undefined, undefined)).toBe(false)
    expect(tokenMatches('short', 'short')).toBe(false)
  })
})

describe('validateRecommendation — 막힌 일요일', () => {
  it('칠십인 일정·단위 행사로 막힌 날은 받지 않는다', () => {
    const r = validateRecommendation(
      request(),
      { ...base, picks: [{ date: '2027-01-10', wardId: 'seoul-nokbeon' }] },
      (date, unitId) => date === '2027-01-10' && unitId === 'seoul-stake',
    )
    expect(r).toMatchObject({ ok: false, code: 'failed-precondition' })
  })

  it('이미 이 단위로 확정된 날은 막혀 있어도 다시 낼 수 있다', () => {
    const decided = request({
      decisions: { '2027-01-10': { unitId: 'seoul-stake', wardId: 'seoul-nokbeon', wardName: '녹번 와드', scheduleId: 'x' } },
    })
    const r = validateRecommendation(
      decided,
      { ...base, picks: [{ date: '2027-01-10', wardId: 'seoul-nokbeon' }] },
      () => true,
    )
    expect(r.ok).toBe(true)
  })
})
