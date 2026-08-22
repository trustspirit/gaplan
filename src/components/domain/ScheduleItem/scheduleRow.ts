import dayjs from 'dayjs'
import type { DataListRow } from '@/components/ui'
import type { Schedule } from '@/types'
import { DOW_LABELS } from '@/utils/date'
import { buildScheduleTitle } from '../../../../functions/src/scheduleRules'

export interface ScheduleRowInput {
  schedule: Schedule
  unitName: string
  wardLabel?: string // resolved (locale-aware) display name for schedule.wardName — looked up by the caller, e.g. useUnits().getWardName
  today: string // YYYY-MM-DD
  t: (key: string, opts?: Record<string, unknown>) => string
}

export function toScheduleRow({
  schedule,
  unitName,
  wardLabel,
  today,
  t,
}: ScheduleRowInput): DataListRow {
  const date = dayjs(schedule.date)
  const dow = DOW_LABELS[date.day()]
  const isPast = date.isBefore(dayjs(today), 'day')

  const title = buildScheduleTitle({
    type: schedule.type,
    unitName,
    wardName: wardLabel ?? schedule.wardName ?? undefined,
    targetKind: schedule.targetKind ?? null,
    customTitle: schedule.customTitle ?? null,
  })

  // 사전 준비 모임 제목은 CF가 생성 시 customTitle에 넣어 두므로(Task 4) 여기서
  // relatedVisitId를 따로 풀 필요가 없다 — buildScheduleTitle이 customTitle을 먼저 본다.
  //
  // 부제는 제목이 말하지 않은 것만 말한다. 장소가 제목에 이미 들어 있으면
  // 상위 유닛 이름으로 물러난다.
  const place = schedule.location?.trim()
  const subtitle = place && !title.includes(place) ? place : place ? unitName : (wardLabel ?? undefined)

  return {
    id: schedule.id,
    lead: { primary: date.format('M.D'), secondary: dow },
    title,
    subtitle,
    meta: `${schedule.startTime} – ${schedule.endTime}`,
    tag: t(`schedule.type.${schedule.type}`),
    dimmed: isPast,
  }
}
