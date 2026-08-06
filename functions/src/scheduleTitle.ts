import { UNIT_NAME_MAP } from './unitNameMap'

export interface ScheduleTitleInput {
  type?: string
  unitId?: string
  wardName?: string | null
  customTitle?: string | null
}

export function buildScheduleTitle(data: ScheduleTitleInput): string {
  if (data.customTitle) return data.customTitle
  const unitName = UNIT_NAME_MAP[data.unitId ?? ''] ?? data.unitId ?? ''
  if (data.type === 'ward_visit') {
    return data.wardName ? `${unitName} - ${data.wardName} 방문` : `${unitName} 방문`
  }
  if (data.type === 'interview') return `${unitName} 접견`
  return unitName ? `${unitName} 모임` : '모임'
}
