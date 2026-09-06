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

/** 이만큼 움직이면 "가로로 끄는 중"으로 확정한다. 탭의 손떨림보다는 크고, 손이 느끼기엔 즉시. */
const DRAG_LOCK_PX = 8

/**
 * 손가락을 따라가는 스와이프에서 "지금부터 가로 드래그"라고 잠글지.
 *
 * 뗄 때 한 번 재는 swipeDirection과 판정이 다른 이유: 여기서는 미는 동안 매 프레임
 * 물어보므로 임계가 훨씬 작아야 한다(안 그러면 48px을 갈 때까지 화면이 안 따라온다).
 * 대신 세로가 더 크면 잠그지 않아 스크롤을 브라우저에 그대로 넘긴다.
 */
export function locksHorizontal(dx: number, dy: number): boolean {
  return Math.abs(dx) > DRAG_LOCK_PX && Math.abs(dx) > Math.abs(dy)
}

/**
 * 손을 뗐을 때 열린 채로 둘지. 드러날 폭의 절반을 넘겼으면 연다 —
 * 끌던 손의 마지막 위치가 곧 답이라 따로 배울 게 없다.
 *
 * 폭이 0이면(아직 재지 못한 순간) 열지 않는다. 폭 0짜리 액션이 드러나면
 * 행만 제자리에 멈춘 것처럼 보인다.
 */
export function settlesOpen(offsetX: number, width: number): boolean {
  return width > 0 && Math.abs(offsetX) >= width / 2
}
