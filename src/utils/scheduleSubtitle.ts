import type { Schedule } from '@/types'

export interface ScheduleSubtitleInput {
  schedule: Schedule
  /** 이미 만들어진 제목. 부제는 이 제목이 말하지 않은 것만 말한다. */
  title: string
  unitName: string
  /** 와드 이름의 로케일 표시형. 호출부가 풀어 넘긴다. */
  wardLabel?: string
}

/**
 * 일정 한 건의 부제 — 제목이 이미 말한 것을 되풀이하지 않는다.
 *
 * 후보(명시적 장소가 있으면 그것, 없으면 와드 라벨)가 제목에 이미 있으면 유닛
 * 이름으로 물러나고, 유닛 이름마저 제목에 있으면(또는 애초에 후보가 없으면)
 * 부제를 비운다. 두 번째 단계가 없으면 장소 없는 방문 일정 전부가 — 제목이
 * `${와드} 방문`이므로 — 부제에서 와드 이름을 그대로 되풀이한다.
 *
 * unitName은 schedule.unitId가 실제로 있을 때만 "유닛 후보"로 친다.
 * cc_council/general_attendance는 unitId: ''로 저장되고, 호출부가 그런 일정에
 * 표시용 타입 라벨("모임")을 unitName 자리에 채워 넘긴다 — 실제 유닛 이름이 아니라
 * placeholder다. 이 함수는 그 문자열이 진짜 유닛명인지 스스로 구분할 수 없으니
 * unitId 유무로 판단한다. 그러지 않으면 CC 협의 평의회 행이 부제로 "모임"이라는
 * 의미 없는 라벨을 되풀이한다.
 *
 * ScheduleItem의 목록 행과 홈의 「다음 일정」 카드가 같이 쓴다 — 판정이 두 곳에
 * 살면 한쪽만 고쳐도 아무 테스트가 안 깨진다.
 */
export function scheduleSubtitle({
  schedule,
  title,
  unitName,
  wardLabel,
}: ScheduleSubtitleInput): string | undefined {
  const hasUnit = !!schedule.unitId
  const candidate = schedule.location?.trim() || wardLabel

  if (candidate && !title.includes(candidate)) return candidate
  if (hasUnit && !title.includes(unitName)) return unitName
  return undefined
}
