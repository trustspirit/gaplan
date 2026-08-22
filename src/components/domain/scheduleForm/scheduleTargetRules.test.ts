import { questionsFor, toTargetPayload, resetForKind, stakeLabelKeyFor, targetKindChoicesFor } from './scheduleTargetRules'

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

  // Controller ruling R5 (2026-08-22): 예전 폼은 대상을 '기타'로 골라도 그때까지 고른
  // 스테이크를 payload에 그대로 실었다 — 그 소속 정보(및 그로부터 유도되는 제목·장소)가
  // 사라지면 안 되므로 '기타'도 스테이크는 묻는다.
  it('직접 입력은 스테이크와 자유 텍스트를 묻는다', () => {
    expect(questionsFor('other')).toEqual({
      asksUnit: true, asksWard: false, asksCc: false, asksFreeText: true,
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

  // Controller ruling R5: 스테이크를 고른 뒤 대상을 '기타'로 고르면(ab3ad67의
  // "서울 스테이크" 선택 → targetSelect='other' 흐름과 같은 값) 그 스테이크가
  // payload에 실려야 한다 — 예전 폼이 항상 그랬다.
  it('직접 입력(기타)은 스테이크를 실은 채 targetKind만 other로 싣는다', () => {
    const p = toTargetPayload({ ...EMPTY, kind: 'other', unitId: 'seoul-stake', freeText: '홍길순' })
    expect(p.unitId).toBe('seoul-stake')
    expect(p.targetKind).toBe('other')
    expect(p.wardName).toBe('')
    expect(p.regionId).toBe('')
    expect(p.wardId).toBeUndefined()
  })
})

// M2 (2026-08-22): 스테이크 select 라벨은 대상 유형(effectiveKind)만으로 정해져야 한다 —
// 어느 모달이 부르든, 일정 종류가 무엇이든 같은 kind면 같은 라벨이 나와야 사용자가
// 지적한 결함(생성/편집 모달이 같은 대상에 다른 라벨을 보여주던 문제)이 재발하지 않는다.
describe('stakeLabelKeyFor', () => {
  it('스테이크/지방부 회장은 필수 라벨', () => {
    expect(stakeLabelKeyFor('stake_president')).toBe('schedule.stakeLabel')
  })

  it('와드 감독도 필수 라벨', () => {
    expect(stakeLabelKeyFor('ward_bishop')).toBe('schedule.stakeLabel')
  })

  it('직접 입력은 선택 라벨', () => {
    expect(stakeLabelKeyFor('other')).toBe('schedule.stakeLabelOptional')
  })

  // 협의 평의회는 스테이크 칸 자체가 뜨지 않으므로(questionsFor) 어떤 값을 돌려주든
  // 실제로 쓰이지 않는다 — 그래도 함수는 항상 문자열을 돌려줘야 한다(다른 kind와의
  // 기본값 일관성을 위해 필수 라벨과 같은 값을 쓴다).
  it('협의 평의회는 스테이크를 묻지 않지만, 함수는 필수 라벨을 기본값으로 돌려준다', () => {
    expect(stakeLabelKeyFor('cc_council')).toBe('schedule.stakeLabel')
  })
})

// Task 1 (스케줄 폼 레이아웃 개선, 2026-08-22): 대상 유형 select이 무엇을 보여줄지는
// TargetSection이 직접 판정하지 않는다 — 편집 모달과 어긋나는 병을 M2에서 이미 겪었으므로
// 하나의 순수 함수로 정리한다. 협의 평의회(cc_council)는 CC 전체가 대상이라 개인 면담
// (접견)의 대상이 될 수 없으므로 모임에만 남긴다.
//
// 브리프(schedule-form-layout/brief.md)는 meeting에 stake_president도 포함해야 한다고
// 적었지만, 이는 이미 자리 잡은 Controller ruling R4(2026-08-22, TargetSection.test.tsx/
// ScheduleFormModal.test.tsx에 회귀 테스트로 고정됨: "CF가 지금까지 한 번도 받아본 적
// 없는 `type: 'meeting'` + `targetKind: 'stake_president'` 조합을 새로 열지 않는다")와
// 정면으로 어긋난다. 이 함수는 R4를 지키는 쪽으로 구현했다 — report.md에 이 불일치를
// 남긴다.
describe('targetKindChoicesFor', () => {
  it('접견은 스테이크/지방부 회장·와드 감독·기타를 제공하고, 협의 평의회는 제공하지 않는다', () => {
    expect(targetKindChoicesFor('interview')).toEqual(['stake_president', 'ward_bishop', 'other'])
  })

  // R4를 지킨다 — 모임에는 스테이크/지방부 회장 대상을 열지 않는다.
  it('모임은 와드 감독·협의 평의회·기타를 제공하고, 스테이크/지방부 회장은 제공하지 않는다', () => {
    expect(targetKindChoicesFor('meeting')).toEqual(['ward_bishop', 'cc_council', 'other'])
  })

  it('와드 방문은 대상 유형 select 자체가 없으므로 빈 배열이다', () => {
    expect(targetKindChoicesFor('ward_visit')).toEqual([])
  })

  it('일반 참석도 대상 유형 select이 없으므로 빈 배열이다', () => {
    expect(targetKindChoicesFor('general_attendance')).toEqual([])
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
