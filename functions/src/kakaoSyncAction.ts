import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { needsKakaoUpdate } from './kakaoEventBody'

dayjs.extend(utc)
dayjs.extend(timezone)

export type KakaoSyncAction = 'skip' | 'create' | 'update'

// schedule.date는 KST 벽시계 날짜다. 함수는 UTC에서 도므로 "오늘"도 반드시
// Asia/Seoul 기준으로 계산해야 한다 — 아니면 KST 오전 9시 이전에는 오늘 일정이
// 과거로 오판된다. 오늘은 과거가 아니다(당일 일정은 계속 생성한다).
export function isPastScheduleDate(date: string | undefined, nowMs: number = Date.now()): boolean {
  if (!date) return false
  const todayKst = dayjs(nowMs).tz('Asia/Seoul').format('YYYY-MM-DD')
  return date < todayKst
}

// existingEventId는 호출부가 이미 올바른 스냅샷(after.kakaoEventIds)에서 뽑아온
// 값이어야 한다 — 어느 스냅샷을 읽을지는 이 함수의 책임이 아니다. 이 함수는
// "그 값이 있고, 동기화에 영향을 주는 필드가 실제로 안 바뀌었으면 건너뛴다"는
// 결정만 담당한다. 트리거 자신이 kakaoEventIds를 쓰면서 스스로를 재호출할 때도
// (before, after)의 SYNCED_FIELDS는 그대로이므로 needsKakaoUpdate가 false를
// 돌려주고, 여기서 'skip'이 나와 중복 생성 없이 재귀가 멈춘다.
export function decideKakaoSyncAction(
  existingEventId: string | undefined,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
): KakaoSyncAction {
  if (existingEventId && !needsKakaoUpdate(before, after)) return 'skip'
  return existingEventId ? 'update' : 'create'
}
