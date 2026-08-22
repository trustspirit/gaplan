import { UNIT_NAME_MAP } from './unitNameMap'
import { CC_COUNCIL_TARGET_KIND } from './ccCouncil'
import { getScopeDisplayName } from './regions'
import { buildScheduleTitle as buildFromParts, type ScheduleNameParts } from './scheduleRules'

export interface ScheduleTitleInput {
  type?: string
  unitId?: string
  regionId?: string | null
  targetKind?: string | null
  wardName?: string | null
  customTitle?: string | null
  preVisitWardName?: string | null
}

/** 문서에 든 id들을 표시 이름으로 바꿔 공용 규칙에 넘긴다. */
export function toNameParts(data: ScheduleTitleInput): ScheduleNameParts {
  const unitName = data.unitId ? (UNIT_NAME_MAP[data.unitId] ?? data.unitId) : undefined
  const ccName =
    data.targetKind === CC_COUNCIL_TARGET_KIND && data.regionId
      ? (getScopeDisplayName(data.regionId) ?? undefined)
      : undefined
  return {
    type: (data.type as ScheduleNameParts['type']) ?? 'meeting',
    unitName,
    wardName: data.wardName ?? undefined,
    targetKind: (data.targetKind as ScheduleNameParts['targetKind']) ?? null,
    ccName,
    preVisitWardName: data.preVisitWardName ?? undefined,
    customTitle: data.customTitle ?? null,
  }
}

export function buildScheduleTitle(data: ScheduleTitleInput): string {
  return buildFromParts(toNameParts(data))
}
