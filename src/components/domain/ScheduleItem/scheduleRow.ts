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
  //
  // unitName은 schedule.unitId가 실제로 있을 때만 "유닛 후보"로 친다(Fix 2,
  // controller ruling). cc_council/general_attendance는 unitId: ''로 저장되고,
  // 호출부(SchedulesPage)는 그런 일정에 표시용 타입 라벨("모임")을 unitName
  // 자리에 채워 넘긴다 — 실제 유닛 이름이 아니라 placeholder다. 이 함수는
  // 순수 함수라 그 문자열이 진짜 유닛명인지 라벨인지 스스로 구분할 수 없으니,
  // schedule.unitId 유무로 판단한다. 그렇지 않으면 CC 협의 평의회/참석 행이
  // 부제로 "모임"이라는 의미 없는 타입 라벨을 그대로 되풀이한다.
  const hasUnit = !!schedule.unitId
  const candidate = schedule.location?.trim() || wardLabel
  const subtitle =
    candidate && !title.includes(candidate)
      ? candidate
      : hasUnit && !title.includes(unitName)
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
