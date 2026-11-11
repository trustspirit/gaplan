import dayjs from 'dayjs'
import type { DataListRow } from '@/components/ui'
import type { Schedule } from '@/types'
import { DOW_LABELS } from '@/utils/date'
import { scheduleSubtitle } from '@/utils/scheduleSubtitle'
import { buildScheduleTitle } from '../../../../functions/src/scheduleRules'
import { scheduleLastDate, scheduleTimeLabel } from '@/utils/scheduleDates'

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
  // 여러 날 모임은 마지막 날이 지나야 지난 일정이다.
  const lastDate = scheduleLastDate(schedule)
  const isPast = lastDate < today

  const title = buildScheduleTitle({
    type: schedule.type,
    unitName,
    wardName: wardLabel ?? schedule.wardName ?? undefined,
    targetKind: schedule.targetKind ?? null,
    customTitle: schedule.customTitle ?? null,
  })

  // 사전 준비 모임 제목은 CF가 생성 시 customTitle에 넣어 두므로(Task 4) 여기서
  // relatedVisitId를 따로 풀 필요가 없다 — buildScheduleTitle이 customTitle을 먼저 본다.
  // 부제 규칙은 홈의 「다음 일정」 카드와 공유한다 — 판정이 두 곳에 살면
  // 한쪽만 고쳐도 아무 테스트가 안 깨진다.
  const subtitle = scheduleSubtitle({ schedule, title, unitName, wardLabel })

  return {
    id: schedule.id,
    lead: { primary: date.format('M.D'), secondary: dow },
    title,
    subtitle,
    meta: scheduleTimeLabel(schedule, t('schedule.allDay')),
    tag: t(`schedule.type.${schedule.type}`),
    dimmed: isPast,
  }
}
