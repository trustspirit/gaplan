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
  other: {
    asksUnit: false,
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
