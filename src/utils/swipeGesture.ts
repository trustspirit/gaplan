export interface SwipePoint {
  x: number
  y: number
}

export type SwipeDirection = 'left' | 'right'

/** 이만큼은 움직여야 스와이프로 친다. 탭의 손떨림이 제스처로 오인되지 않을 거리. */
export const SWIPE_THRESHOLD_PX = 48

/**
 * 가로가 세로의 이 배수를 "넘어야" 가로 스와이프로 친다. 딱 맞는 값(대각선)은
 * 인정하지 않는다 — 세로 스크롤 중의 흔들림이 행을 열어 버리면 목록을 훑을 수 없다.
 */
const HORIZONTAL_RATIO = 1.5

/**
 * 이 포인터를 스와이프로 추적할지. 마우스는 제외한다 — 데스크톱에는 ⋯ 메뉴와
 * 달력 화살표라는 제대로 된 경로가 이미 있고, 드래그가 스와이프로 잡히면
 * 텍스트 선택 같은 평범한 동작을 망친다.
 */
export function tracksPointer(pointerType: string): boolean {
  return pointerType !== 'mouse'
}

/**
 * 스와이프 방향 판정. 임계 거리와 가로/세로 비율을 둘 다 만족해야 방향이 나온다.
 *
 * 달력의 기간 넘김과 일정 행의 액션 열기가 같은 판정을 쓴다 — 한 앱 안에서 두
 * 스와이프가 서로 다른 임계값을 가지면 손이 둘을 다르게 기억해야 한다.
 *
 * @param start pointerdown 지점. 없으면(pointerdown 없이 온 pointerup) null.
 */
export function swipeDirection(start: SwipePoint | null, end: SwipePoint): SwipeDirection | null {
  if (!start) return null

  const dx = end.x - start.x
  const dy = end.y - start.y

  if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return null
  if (Math.abs(dx) <= Math.abs(dy) * HORIZONTAL_RATIO) return null

  return dx < 0 ? 'left' : 'right'
}
