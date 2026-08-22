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
  // 부제는 제목이 말하지 않은 것만 말한다. 후보(명시적 장소가 있으면 그것,
  // 없으면 와드 라벨)가 제목에 이미 있으면 유닛 이름으로 물러나고, 유닛
  // 이름마저 이미 제목에 있으면(또는 애초에 후보가 없으면) 부제를 아예
  // 비운다. 이 두 번째 단계가 없으면 장소 없는 기존 일정 전부가 — 제목이
  // 이제 `${와드} 방문`이므로 — 부제에서 와드 이름을 그대로 되풀이하게 된다.
  const candidate = schedule.location?.trim() || wardLabel
  const subtitle =
    candidate && !title.includes(candidate)
      ? candidate
      : !title.includes(unitName)
        ? unitName
        : undefined

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
