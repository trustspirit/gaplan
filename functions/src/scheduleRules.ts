/**
 * 일정의 제목·장소 규칙. CF와 클라이언트가 **둘 다** 이 파일을 import한다.
 *
 * 그래서 여기에는 import가 하나도 없어야 한다 — firebase-admin이나
 * firebase-functions를 끌어오는 순간 서버 SDK가 웹 번들로 샌다. id→이름 해석은
 * 각자 자기 쪽에서 하고(UNIT_NAME_MAP / useUnits), 이 규칙들은 이미 해석된
 * 이름만 받는다.
 */

export type ScheduleKindForTitle = 'ward_visit' | 'interview' | 'meeting' | 'general_attendance'

export interface ScheduleNameParts {
  type: ScheduleKindForTitle
  unitName?: string
  wardName?: string
  targetKind?: 'stake_president' | 'ward_bishop' | 'other' | 'cc_council' | null
  ccName?: string
  preVisitWardName?: string
  customTitle?: string | null
}

export function buildScheduleTitle(parts: ScheduleNameParts): string {
  const custom = parts.customTitle?.trim()
  if (custom) return custom

  if (parts.targetKind === 'cc_council') {
    return parts.ccName ? `${parts.ccName} 협의 평의회` : '협의 평의회'
  }

  if (parts.preVisitWardName) return `${parts.preVisitWardName} 방문 사전 모임`

  if (parts.type === 'ward_visit') {
    const subject = parts.wardName ?? parts.unitName
    return subject ? `${subject} 방문` : '방문'
  }

  if (parts.type === 'interview') {
    if (parts.targetKind === 'ward_bishop' && parts.wardName) return `${parts.wardName} 감독 접견`
    if (parts.targetKind === 'stake_president' && parts.unitName) {
      return `${parts.unitName} 회장 접견`
    }
    return parts.unitName ? `${parts.unitName} 접견` : '접견'
  }

  return parts.unitName ? `${parts.unitName} 모임` : '모임'
}

export interface ScheduleLocationParts extends ScheduleNameParts {
  zoomLink?: string | null
  /** 사용자가 폼에 직접 쓴 장소. 있으면 유도 규칙을 건너뛴다. */
  location?: string | null
}

export function buildScheduleLocation(parts: ScheduleLocationParts): string | null {
  const written = parts.location?.trim()
  if (written) return written

  // 온라인 여부가 먼저다 — 물리적 장소보다 "어디로 가야 하는가"를 더 크게 바꾼다.
  if (parts.zoomLink?.trim()) return '온라인 (Zoom)'

  if (parts.targetKind === 'cc_council') return parts.ccName ?? null
  if (parts.type === 'ward_visit') return parts.wardName ?? parts.unitName ?? null
  return parts.unitName ?? null
}
