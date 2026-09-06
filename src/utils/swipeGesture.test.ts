import { describe, it, expect } from 'vitest'
import {
  SWIPE_THRESHOLD_PX,
  locksHorizontal,
  settlesOpen,
  swipeDirection,
  tracksPointer,
} from './swipeGesture'

const from = { x: 200, y: 100 }

describe('tracksPointer', () => {
  // 마우스로 드래그하는 건 스와이프가 아니다 — 데스크톱에는 ⋯ 메뉴와 달력 화살표가 있다.
  it('마우스는 추적하지 않는다', () => {
    expect(tracksPointer('mouse')).toBe(false)
  })

  it('터치와 펜은 추적한다', () => {
    expect(tracksPointer('touch')).toBe(true)
    expect(tracksPointer('pen')).toBe(true)
  })
})

describe('swipeDirection', () => {
  it('임계값을 넘겨 왼쪽으로 밀면 left', () => {
    expect(swipeDirection(from, { x: from.x - SWIPE_THRESHOLD_PX, y: 100 })).toBe('left')
  })

  it('임계값을 넘겨 오른쪽으로 밀면 right', () => {
    expect(swipeDirection(from, { x: from.x + SWIPE_THRESHOLD_PX, y: 100 })).toBe('right')
  })

  it('임계값에 못 미치면 아무것도 아니다 — 탭이 스와이프로 오인되면 안 된다', () => {
    expect(swipeDirection(from, { x: from.x - (SWIPE_THRESHOLD_PX - 1), y: 100 })).toBeNull()
  })

  // 세로 스크롤 중의 손가락 흔들림이 행을 열어 버리면 목록을 훑을 수가 없다.
  it('세로 이동이 더 크면 무시한다', () => {
    expect(swipeDirection(from, { x: from.x - 60, y: 100 + 60 })).toBeNull()
  })

  it('가로가 세로의 1.5배를 넘어야 인정한다', () => {
    // dx 60, dy 40 → 1.5배 정확히 = 인정하지 않는다
    expect(swipeDirection(from, { x: from.x - 60, y: 140 })).toBeNull()
    // dx 60, dy 30 → 2배 = 인정
    expect(swipeDirection(from, { x: from.x - 60, y: 130 })).toBe('left')
  })

  it('시작점이 없으면 null — pointerdown 없이 도착한 pointerup을 흘린다', () => {
    expect(swipeDirection(null, { x: 0, y: 0 })).toBeNull()
  })
})

// 손가락을 따라가는 스와이프(일정 행)용 판정 — 미는 동안 실시간으로 움직여야
// 하므로, 뗄 때 한 번 재는 swipeDirection과는 다른 판정이 필요하다.
describe('locksHorizontal', () => {
  it('가로로 조금이라도 확실히 움직이면 잠근다', () => {
    expect(locksHorizontal(-12, 2)).toBe(true)
  })

  it('아직 거의 안 움직였으면 잠그지 않는다 — 탭이 드래그로 잡히면 안 된다', () => {
    expect(locksHorizontal(-4, 0)).toBe(false)
  })

  // 세로가 더 크면 스크롤이다. 여기서 잠그면 목록을 훑을 수 없다.
  it('세로가 더 크면 잠그지 않는다', () => {
    expect(locksHorizontal(-12, 20)).toBe(false)
  })
})

describe('settlesOpen', () => {
  it('절반을 넘겨 끌었으면 열린 채로 둔다', () => {
    expect(settlesOpen(-70, 136)).toBe(true)
  })

  it('절반에 못 미치면 되닫는다', () => {
    expect(settlesOpen(-40, 136)).toBe(false)
  })

  it('정확히 절반이면 연다', () => {
    expect(settlesOpen(-68, 136)).toBe(true)
  })

  // 아직 폭을 재지 못한 순간(첫 렌더 등)에 열어 버리면 폭 0짜리 액션이 드러난다.
  it('폭을 모르면 열지 않는다', () => {
    expect(settlesOpen(-100, 0)).toBe(false)
  })
})
