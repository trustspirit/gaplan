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
