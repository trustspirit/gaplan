import dayjs from 'dayjs'
import type { Schedule } from '@/types'

export type WhenGroupKey = 'today' | 'tomorrow' | 'thisWeek' | 'later'

/** 화면에 나오는 순서. 그룹이 비면 Map에 아예 넣지 않으므로 이 배열은 후보 목록이다. */
const ORDER: WhenGroupKey[] = ['today', 'tomorrow', 'thisWeek', 'later']

/**
 * 홈의 「다가오는 일정」을 오늘/내일/이번 주/이후로 묶는다.
 *
 * 「이번 주」는 모레부터 그 주 토요일까지다. 교회 주간이 일요일에 시작하므로 토요일이
 * 경계고, 다음 일요일부터는 「이후」로 넘어간다 — 그래야 주가 바뀌는 걸 화면이 보여준다.
 * 오늘이 토요일이면 모레는 이미 다음 주라 이번 주 그룹은 비고, 빈 그룹은 생략된다.
 *
 * 정렬하지 않는다. 순서는 selectGlanceSchedules가 이미 정했다.
 *
 * @param today 'YYYY-MM-DD'. 호출자가 넘겨 테스트가 시계에 매이지 않게 한다.
 */
export function groupByWhen(
  schedules: Schedule[],
  today: string,
): Map<WhenGroupKey, Schedule[]> {
  const base = dayjs(today)
  const tomorrow = base.add(1, 'day').format('YYYY-MM-DD')
  // dayjs의 주는 일요일에 시작한다 — endOf('week')가 곧 그 주 토요일이다.
  const weekEnd = base.endOf('week').format('YYYY-MM-DD')

  const bucketOf = (date: string): WhenGroupKey => {
    if (date === today) return 'today'
    if (date === tomorrow) return 'tomorrow'
    if (date <= weekEnd) return 'thisWeek'
    return 'later'
  }

  const buckets = new Map<WhenGroupKey, Schedule[]>()
  for (const schedule of schedules) {
    const key = bucketOf(schedule.date)
    const group = buckets.get(key)
    if (group) group.push(schedule)
    else buckets.set(key, [schedule])
  }

  // 삽입 순서가 아니라 화면 순서로 돌려준다 — 목록이 날짜순이 아니어도 헤더 순서는 고정이다.
  const ordered = new Map<WhenGroupKey, Schedule[]>()
  for (const key of ORDER) {
    const group = buckets.get(key)
    if (group) ordered.set(key, group)
  }
  return ordered
}
