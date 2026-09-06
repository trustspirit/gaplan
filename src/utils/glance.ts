import dayjs from 'dayjs'
import type { Schedule } from '@/types'

const ACTIVE = (s: Schedule) => s.status === 'confirmed' || s.status === 'pending'

export function selectGlanceSchedules(
  schedules: Schedule[],
  today: string,
  opts: { days?: number; minItems?: number; maxItems?: number } = {},
): Schedule[] {
  const { days = 14, minItems = 3, maxItems = 5 } = opts
  const horizon = dayjs(today).add(days, 'day').format('YYYY-MM-DD')

  const upcoming = schedules
    .filter(s => ACTIVE(s) && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))

  const within = upcoming.filter(s => s.date <= horizon)
  if (within.length >= minItems) return within
  return upcoming.slice(0, maxItems)
}

export interface NextUpSplit {
  /** 홈 맨 위에 크게 올릴 한 건. 보여줄 게 없으면 null. */
  next: Schedule | null
  /** 그 아래 목록에 남길 나머지. next는 여기 들어가지 않는다. */
  rest: Schedule[]
}

/**
 * 「다음 일정」 카드 한 건을 목록에서 빼낸다.
 *
 * 이미 시작했지만 아직 끝나지 않은 일정이 있으면 그게 우선이다 — 오후 2시 접견 도중에
 * 홈을 열었는데 화면이 그 다음 것을 가리키면 "지금 뭘 하고 있는가"를 놓친다.
 * 그 외에는 목록의 첫 건이다.
 *
 * 정렬은 하지 않는다. 무엇을 어떤 순서로 보여줄지는 selectGlanceSchedules가 이미
 * 정했고, 판정이 두 곳에 살면 한쪽만 고쳐도 아무 테스트가 안 깨진다.
 *
 * @param now 'YYYY-MM-DDTHH:mm'. 호출자가 넘겨 테스트가 시계에 매이지 않게 한다.
 */
export function splitNextUp(schedules: Schedule[], now: string): NextUpSplit {
  const ongoingIndex = schedules.findIndex(
    (s) => `${s.date}T${s.startTime}` <= now && now < `${s.date}T${s.endTime}`,
  )
  const index = ongoingIndex >= 0 ? ongoingIndex : schedules.findIndex((s) => `${s.date}T${s.startTime}` > now)

  if (index < 0) return { next: null, rest: [] }
  return { next: schedules[index], rest: schedules.filter((_, i) => i !== index) }
}
