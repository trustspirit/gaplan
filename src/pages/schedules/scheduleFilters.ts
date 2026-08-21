import type { AppUser, GeneralSchedule, Schedule, ScheduleType } from '@/types'
import type { DateRange } from '@/hooks/useScheduleDateRange'
import { getScheduleRegionId } from '@/constants/regions'

/** 일정 화면의 종류 필터. 옛 `/schedules/:tab` 세 탭이 여기로 내려왔다. */
export type ScheduleKind = 'visit' | 'interview' | 'event'

/** 목록 뷰의 상태 필터. 옛 ScheduleTypePanel의 전체/예정/완료 탭이다. */
export type ScheduleStatusFilter = 'all' | 'upcoming' | 'completed'

export const SCHEDULE_KINDS: readonly ScheduleKind[] = ['visit', 'interview', 'event']

/**
 * `general_attendance`가 없는 것은 실수가 아니다. 그건 행사 **참석 기록**이지
 * 일정이 아니고, 행사 자체는 GeneralSchedule로 따로 실려 온다. 여기에 넣으면
 * 참석 등록한 행사가 목록에 두 줄로 나온다(옛 CalendarPage가 그랬다).
 */
const KIND_OF_TYPE: Partial<Record<ScheduleType, ScheduleKind>> = {
  ward_visit: 'visit',
  interview: 'interview',
  meeting: 'interview',
}

export function kindOfScheduleType(type: ScheduleType): ScheduleKind | null {
  return KIND_OF_TYPE[type] ?? null
}

/**
 * 종류 칩 하나를 뒤집는다. SCHEDULE_KINDS 순서로 다시 만들므로 토글해도 칩 순서가 변하지 않는다.
 * 마지막 하나는 끄지 않는다 — 전부 꺼지면 빈 화면만 남고 되돌릴 실마리가 없다.
 */
export function toggleScheduleKind(kinds: ScheduleKind[], kind: ScheduleKind): ScheduleKind[] {
  const selected = new Set(kinds)
  if (selected.has(kind) && selected.size === 1) return kinds
  return SCHEDULE_KINDS.filter((k) => (k === kind ? !selected.has(k) : selected.has(k)))
}

export type BoardEntry =
  | { source: 'schedule'; schedule: Schedule }
  | { source: 'event'; event: GeneralSchedule }

export interface BoardItem {
  /** React key이자 테스트 좌표. `s-<id>` 또는 `e-<id>`. */
  key: string
  date: string
  /** 정렬용. 시각 없는 행사는 '00:00'이라 그 날의 맨 앞에 온다. */
  time: string
  kind: ScheduleKind
  entry: BoardEntry
}

interface BuildParams {
  schedules: Schedule[]
  generalSchedules: GeneralSchedule[]
  kinds: ScheduleKind[]
  range: DateRange
  /** 삭제 되돌리기를 기다리는 id. 화면에서 즉시 감춘다. */
  hiddenIds?: ReadonlySet<string>
}

// 날짜는 전부 'YYYY-MM-DD' 문자열이므로 사전순 비교가 곧 시간순 비교다.
// dayjs를 끌어들이지 않는 이유 — 이 모듈에는 시간대가 개입할 여지가 없어야 한다.
function inRange(date: string, range: DateRange) {
  return date >= range.start && date <= range.end
}

export function buildBoardItems({
  schedules,
  generalSchedules,
  kinds,
  range,
  hiddenIds,
}: BuildParams): BoardItem[] {
  const selected = new Set(kinds)
  const items: BoardItem[] = []

  for (const schedule of schedules) {
    if (schedule.status !== 'confirmed') continue
    if (hiddenIds?.has(schedule.id)) continue
    const kind = kindOfScheduleType(schedule.type)
    if (!kind || !selected.has(kind)) continue
    if (!inRange(schedule.date, range)) continue
    items.push({
      key: `s-${schedule.id}`,
      date: schedule.date,
      time: schedule.startTime,
      kind,
      entry: { source: 'schedule', schedule },
    })
  }

  if (selected.has('event')) {
    for (const event of generalSchedules) {
      if (hiddenIds?.has(event.id)) continue
      if (!inRange(event.date, range)) continue
      items.push({
        key: `e-${event.id}`,
        date: event.date,
        time: event.startTime ?? '00:00',
        kind: 'event',
        entry: { source: 'event', event },
      })
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

/** `today`를 인자로 받아 테스트가 시계에 매이지 않게 한다. */
export function filterByStatus(
  items: BoardItem[],
  status: ScheduleStatusFilter,
  today: string,
): BoardItem[] {
  if (status === 'all') return items
  // 오늘은 아직 안 지났다 — 예정 쪽이다.
  if (status === 'upcoming') return items.filter((i) => i.date >= today)
  return items.filter((i) => i.date < today)
}

export function filterByRegion(items: BoardItem[], regionId: string | null): BoardItem[] {
  if (regionId == null) return items
  return items.filter((item) => {
    if (item.entry.source === 'schedule') {
      return getScheduleRegionId(item.entry.schedule) === regionId
    }
    // 대상 지역이 비어 있으면 전사 공지다 — 어느 지역에서도 보인다.
    const targets = item.entry.event.targetRegionIds
    return !targets?.length || targets.includes(regionId)
  })
}

export interface BoardCounts {
  thisMonth: number
  upcoming: number
  completed: number
}

/** 지표 3칸. 종류·지역·기간은 이미 반영된 목록을 받고, 상태 필터는 반영하지 않는다. */
export function countBoardItems(items: BoardItem[], today: string): BoardCounts {
  const month = today.slice(0, 7)
  return {
    thisMonth: items.filter((i) => i.date.slice(0, 7) === month).length,
    upcoming: items.filter((i) => i.date >= today).length,
    completed: items.filter((i) => i.date < today).length,
  }
}

/** 키는 'YYYY-MM'. 입력이 이미 날짜순이므로 삽입 순서가 곧 월 순서다. */
export function groupBoardItemsByMonth(items: BoardItem[]): Map<string, BoardItem[]> {
  const grouped = new Map<string, BoardItem[]>()
  for (const item of items) {
    const key = item.date.slice(0, 7)
    const bucket = grouped.get(key)
    if (bucket) bucket.push(item)
    else grouped.set(key, [item])
  }
  return grouped
}

/**
 * 화면이 구독할 일정 질의. CalendarPage와 ScheduleTypePanel이 이 분기를 각자
 * 갖고 있었다 — 한쪽만 고치면 두 화면이 다른 일정을 보여 준다.
 */
export function scheduleQueryFor(user: AppUser): { presidentUid?: string; seventyUid?: string } {
  if (user.role === 'president') return { presidentUid: user.uid }
  if (user.role === 'seventy') return { seventyUid: user.uid }
  // 배정된 칠십인이 없으면 빈 문자열을 넘긴다. 이 빈 문자열은 falsy라
  // subscribeToSchedules(scheduleService.ts)의 `else if (filters.seventyUid)`를
  // 타지 못하고 무제한 조회 분기로 빠진다 — 하지만 그 조회를 실제로 막는 건
  // firestore.rules다. 제약 없는 schedules 조회는 규칙이 거부하므로, 배정 안 된
  // exec_secretary 화면에는 남의 일정이 아니라 permission-denied 에러와 빈
  // 목록이 뜬다. CalendarPage.tsx·ScheduleTypePanel.tsx의 기존 동작과 같다.
  if (user.role === 'exec_secretary') return { seventyUid: user.assignedSeventyUid ?? '' }
  return {}
}
