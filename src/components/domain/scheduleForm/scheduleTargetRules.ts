import { getWardIdByName } from '@/constants/regions'

export type TargetKindChoice = 'stake_president' | 'ward_bishop' | 'cc_council' | 'other'

/** 고른 대상 유형이 다음에 무엇을 묻는지 */
export interface TargetQuestions {
  asksUnit: boolean
  asksWard: boolean
  asksCc: boolean
  asksFreeText: boolean
}

export interface TargetSelection {
  kind: TargetKindChoice | ''
  unitId: string
  wardName: string
  ccRegionId: string
  freeText: string
}

export interface TargetPayloadFields {
  unitId: string
  wardName: string
  regionId: string
  targetKind: TargetKindChoice | null
  wardId?: string
}

/** Define the rules once — both questionsFor and resetForKind will use this */
const KIND_RULES: Record<TargetKindChoice | '', TargetQuestions> = {
  stake_president: {
    asksUnit: true,
    asksWard: false,
    asksCc: false,
    asksFreeText: false,
  },
  ward_bishop: {
    asksUnit: true,
    asksWard: true,
    asksCc: false,
    asksFreeText: false,
  },
  cc_council: {
    asksUnit: false,
    asksWard: false,
    asksCc: true,
    asksFreeText: false,
  },
  // 직접 입력(other)도 스테이크는 묻는다 — 예전 폼은 대상을 '기타'로 골라도 그때까지
  // 고른 스테이크(unitId)를 그대로 payload에 실었다(ab3ad67:ScheduleFormModal.tsx:306).
  // 이 유형만 스테이크를 안 물으면 그 소속 정보가 사라지고 제목·장소도 "접견"/null로
  // 퇴화한다(Controller ruling R5, 2026-08-22). kind는 여전히 무엇을 물을지 결정하고,
  // 스테이크는 그 아래에서 묻는다 — 역방향 의존이 되살아나는 게 아니다.
  other: {
    asksUnit: true,
    asksWard: false,
    asksCc: false,
    asksFreeText: true,
  },
  '': {
    asksUnit: false,
    asksWard: false,
    asksCc: false,
    asksFreeText: false,
  },
}

/**
 * 고른 대상 유형이 다음에 무엇을 묻는지 알려준다.
 */
export function questionsFor(kind: TargetKindChoice | ''): TargetQuestions {
  return KIND_RULES[kind]
}

/**
 * 유형에 따라 페이로드에 실릴 값들. 묻지 않은 칸은 반드시 비운다.
 */
export function toTargetPayload(sel: TargetSelection): TargetPayloadFields {
  const questions = questionsFor(sel.kind)
  const payload: TargetPayloadFields = {
    unitId: questions.asksUnit ? sel.unitId : '',
    wardName: questions.asksWard ? sel.wardName : '',
    regionId: questions.asksCc ? sel.ccRegionId : '',
    targetKind: sel.kind === '' ? null : sel.kind,
  }

  // Only add wardId if we're asking for ward and have a ward name
  if (questions.asksWard && sel.wardName) {
    payload.wardId = getWardIdByName(sel.wardName)
  }

  return payload
}

/**
 * 스테이크/지방부 select 라벨의 번역 키 — 대상 유형(effectiveKind)만으로 정한다.
 * 일정 종류(interview/meeting)는 관여하지 않는다: 생성 모달과 편집 모달이 같은 대상
 * 유형이라면 반드시 같은 라벨을 보여줘야 한다(사용자가 직접 지적한 결함 — 두 모달이
 * 서로 다른 기준(일정 종류 vs 판단 안 함)으로 라벨을 정해 어긋났었다).
 * stake_president/ward_bishop은 필수, other는 선택. cc_council은 스테이크 칸 자체가
 * 뜨지 않으므로(questionsFor) 실제로 쓰이지 않지만, 함수는 항상 값을 돌려준다.
 */
export function stakeLabelKeyFor(kind: TargetKindChoice | ''): string {
  return kind === 'other' ? 'schedule.stakeLabelOptional' : 'schedule.stakeLabel'
}

/**
 * 유형을 바꿀 때 남으면 안 되는 값을 지운 새 selection.
 * 새 유형이 묻지 않는 칸은 비우고, 계속 묻는 칸은 남긴다.
 */
export function resetForKind(sel: TargetSelection, next: TargetKindChoice | ''): TargetSelection {
  const nextQuestions = questionsFor(next)

  return {
    kind: next,
    unitId: nextQuestions.asksUnit ? sel.unitId : '',
    wardName: nextQuestions.asksWard ? sel.wardName : '',
    ccRegionId: nextQuestions.asksCc ? sel.ccRegionId : '',
    freeText: nextQuestions.asksFreeText ? sel.freeText : '',
  }
}
