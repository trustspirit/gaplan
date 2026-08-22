import { questionsFor, toTargetPayload, resetForKind } from './scheduleTargetRules'

const EMPTY = { kind: '' as const, unitId: '', wardName: '', ccRegionId: '', freeText: '' }

describe('questionsFor', () => {
  it('스테이크 회장은 스테이크만 묻는다', () => {
    expect(questionsFor('stake_president')).toEqual({
      asksUnit: true, asksWard: false, asksCc: false, asksFreeText: false,
    })
  })

  it('와드 감독은 스테이크와 와드를 묻는다', () => {
    expect(questionsFor('ward_bishop')).toEqual({
      asksUnit: true, asksWard: true, asksCc: false, asksFreeText: false,
    })
  })

  // CC 협의 평의회가 유형이 된 것이 이 계획의 핵심이다 — 스테이크를 아예 묻지 않으므로
  // 나중에 스테이크 값을 지울 일도 없다.
  it('협의 평의회는 CC만 묻고 스테이크는 묻지 않는다', () => {
    expect(questionsFor('cc_council')).toEqual({
      asksUnit: false, asksWard: false, asksCc: true, asksFreeText: false,
    })
  })

  it('직접 입력은 자유 텍스트만 묻는다', () => {
    expect(questionsFor('other')).toEqual({
      asksUnit: false, asksWard: false, asksCc: false, asksFreeText: true,
    })
  })

  it('아직 고르지 않았으면 아무것도 묻지 않는다', () => {
    expect(questionsFor('')).toEqual({
      asksUnit: false, asksWard: false, asksCc: false, asksFreeText: false,
    })
  })
})

describe('toTargetPayload', () => {
  it('와드 감독은 유닛·와드·와드 id를 싣는다', () => {
    const p = toTargetPayload({ ...EMPTY, kind: 'ward_bishop', unitId: 'seoul-east-stake', wardName: '교문 와드' })
    expect(p.unitId).toBe('seoul-east-stake')
    expect(p.wardName).toBe('교문 와드')
    expect(p.targetKind).toBe('ward_bishop')
    expect(p.regionId).toBe('')
  })

  // 묻지 않은 칸이 페이로드로 새어 나가면 CF가 엉뚱한 문서를 만든다.
  it('협의 평의회는 유닛과 와드를 비우고 CC만 싣는다', () => {
    const p = toTargetPayload({
      ...EMPTY, kind: 'cc_council', ccRegionId: 'seoul',
      unitId: 'seoul-east-stake', wardName: '교문 와드',   // 유형을 바꾸기 전 남아 있던 값
    })
    expect(p.unitId).toBe('')
    expect(p.wardName).toBe('')
    expect(p.regionId).toBe('seoul')
    expect(p.targetKind).toBe('cc_council')
  })

  it('스테이크 회장은 와드를 싣지 않는다', () => {
    const p = toTargetPayload({ ...EMPTY, kind: 'stake_president', unitId: 'seoul-east-stake', wardName: '교문 와드' })
    expect(p.wardName).toBe('')
    expect(p.targetKind).toBe('stake_president')
  })

  it('고르지 않았으면 targetKind는 null이다', () => {
    expect(toTargetPayload(EMPTY).targetKind).toBeNull()
  })
})

describe('resetForKind', () => {
  it('협의 평의회로 바꾸면 스테이크·와드가 지워진다', () => {
    const next = resetForKind(
      { ...EMPTY, kind: 'ward_bishop', unitId: 'seoul-east-stake', wardName: '교문 와드' },
      'cc_council',
    )
    expect(next).toEqual({ ...EMPTY, kind: 'cc_council' })
  })

  it('스테이크 회장으로 바꾸면 와드만 지우고 스테이크는 남긴다', () => {
    const next = resetForKind(
      { ...EMPTY, kind: 'ward_bishop', unitId: 'seoul-east-stake', wardName: '교문 와드' },
      'stake_president',
    )
    expect(next).toEqual({ ...EMPTY, kind: 'stake_president', unitId: 'seoul-east-stake' })
  })
})
