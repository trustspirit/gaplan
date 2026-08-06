import { needsKakaoUpdate } from './kakaoEventBody'

export type KakaoSyncAction = 'skip' | 'create' | 'update'

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
