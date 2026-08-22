import { buildScheduleLocation } from './scheduleRules'
import { toNameParts, type ScheduleTitleInput } from './scheduleTitle'

export interface ScheduleFieldInput extends ScheduleTitleInput {
  zoomLink?: string | null
  location?: string | null
}

/** 저장할 location 값을 정한다. 사용자 입력 우선, 없으면 유도, 그래도 없으면 null. */
export function resolveScheduleLocation(data: ScheduleFieldInput): string | null {
  return buildScheduleLocation({
    ...toNameParts(data),
    zoomLink: data.zoomLink ?? null,
    location: data.location ?? null,
  })
}

/** 수정 시점에 이미 저장돼 있던 문서 — location을 다시 유도할 때 필요한 필드만 받는다. */
export interface ScheduleDocumentForLocation {
  type?: string
  unitId?: string
  regionId?: string | null
  targetKind?: string | null
  wardName?: string | null
  zoomLink?: string | null
}

/** 이번 수정 요청이 들고 온, location에 영향을 주는 필드들 — 부분 업데이트이므로 안 온 필드는 undefined. */
export interface ScheduleLocationUpdateInput {
  unitId?: string
  targetKind?: string | null
  wardName?: string | null
  zoomLink?: string | null
  location?: string | null
}

/**
 * 수정 시 저장할 location을 정한다. location은 write time에 다시 확정한다 —
 * 이번 요청이 값을 명시(trim 후 비어있지 않음)했으면 그 값이 항상 이긴다.
 * 그렇지 않으면(비었거나 아예 안 왔으면) "기존 문서 + 이번 업데이트"를 합친
 * 수정 이후 상태로 다시 유도한다. customTitle과 달리 location은 사용자가
 * 직접 쓴 문구를 다음 수정에서도 지켜주는 필드가 아니다 — 매 쓰기마다
 * 와드/유닛/대상유형/줌링크가 바뀌면 그 최신 상태를 반영해야 한다.
 */
export function resolveScheduleLocationForEdit(
  current: ScheduleDocumentForLocation,
  updates: ScheduleLocationUpdateInput,
): string | null {
  const explicit = typeof updates.location === 'string' ? updates.location.trim() : ''
  if (explicit) return explicit

  return resolveScheduleLocation({
    type: current.type,
    unitId: updates.unitId !== undefined ? updates.unitId : current.unitId,
    regionId: current.regionId,
    targetKind: updates.targetKind !== undefined ? updates.targetKind : current.targetKind,
    wardName: updates.wardName !== undefined ? updates.wardName : current.wardName,
    zoomLink: updates.zoomLink !== undefined ? updates.zoomLink : current.zoomLink,
    location: null,
  })
}
