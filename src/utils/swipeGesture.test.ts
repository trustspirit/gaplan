import { describe, it, expect } from 'vitest'
import { SWIPE_THRESHOLD_PX, swipeDirection, tracksPointer } from './swipeGesture'

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
