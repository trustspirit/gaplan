import { UNIT_NAME_MAP } from './unitNameMap'
import { buildCcCouncilTitle, CC_COUNCIL_TARGET_KIND } from './ccCouncil'

export interface ScheduleTitleInput {
  type?: string
  unitId?: string
  regionId?: string | null
  targetKind?: string | null
  wardName?: string | null
  customTitle?: string | null
}

export function buildScheduleTitle(data: ScheduleTitleInput): string {
  if (data.customTitle) return data.customTitle
  // 협의 평의회는 unitId가 없어 유닛 이름으로는 '모임'까지밖에 못 간다.
  if (data.targetKind === CC_COUNCIL_TARGET_KIND && data.regionId) {
    return buildCcCouncilTitle(data.regionId)
  }
  const unitName = UNIT_NAME_MAP[data.unitId ?? ''] ?? data.unitId ?? ''
  if (data.type === 'ward_visit') {
    return data.wardName ? `${unitName} - ${data.wardName} 방문` : `${unitName} 방문`
  }
  if (data.type === 'interview') return `${unitName} 접견`
  return unitName ? `${unitName} 모임` : '모임'
}
