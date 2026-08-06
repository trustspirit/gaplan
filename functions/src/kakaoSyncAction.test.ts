import { describe, it, expect } from 'vitest'
import { decideKakaoSyncAction, isPastScheduleDate } from './kakaoSyncAction'

const CONFIRMED = {
  status: 'confirmed',
  date: '2026-08-09',
  startTime: '10:00',
  endTime: '11:00',
}

describe('decideKakaoSyncAction', () => {
  it('이벤트가 없으면 생성한다', () => {
    expect(decideKakaoSyncAction(undefined, undefined, CONFIRMED)).toBe('create')
  })

  // 트레이스 1: 최초 확정 후 트리거가 kakaoEventIds를 쓰면서 스스로를 재호출한다.
  // before/after 둘 다 CONFIRMED와 동일한 동기화 대상 필드를 담고 있고(같은
  // 스냅샷에서 파생), 이벤트 id도 이미 있다 — 재생성 없이 건너뛰어야 한다.
  it('이벤트가 있고 동기화 대상 필드가 그대로면 건너뛴다 (자기 재호출을 no-op으로 만든다)', () => {
    expect(decideKakaoSyncAction('event-1', CONFIRMED, CONFIRMED)).toBe('skip')
  })

  // 트레이스 2: 확정 후 일정 시간이 수정된 경우 — 새로 만들지 않고 기존 이벤트를 갱신한다.
  it('이벤트가 있고 동기화 대상 필드가 바뀌었으면 갱신한다', () => {
    const edited = { ...CONFIRMED, startTime: '14:00', endTime: '15:00' }
    expect(decideKakaoSyncAction('event-1', CONFIRMED, edited)).toBe('update')
  })

  it('이전 스냅샷이 없으면(최초 쓰기) 이벤트가 있어도 갱신한다', () => {
    expect(decideKakaoSyncAction('event-1', undefined, CONFIRMED)).toBe('update')
  })
})

describe('isPastScheduleDate', () => {
  // 함수는 UTC에서 돌지만 schedule.date는 KST 날짜다. KST 8/7 오전 8시는
  // UTC로는 아직 8/6이므로, UTC 기준으로 "오늘"을 잡으면 당일 일정이 과거로
  // 오판돼 생성이 막힌다.
  const NOW = new Date('2026-08-06T23:00:00Z').getTime() // = KST 2026-08-07 08:00

  it('오늘(KST)은 과거가 아니다', () => {
    expect(isPastScheduleDate('2026-08-07', NOW)).toBe(false)
  })

  it('어제는 과거다', () => {
    expect(isPastScheduleDate('2026-08-06', NOW)).toBe(true)
  })

  it('내일은 과거가 아니다', () => {
    expect(isPastScheduleDate('2026-08-08', NOW)).toBe(false)
  })

  it('date가 없으면 과거로 보지 않는다', () => {
    expect(isPastScheduleDate(undefined, NOW)).toBe(false)
  })
})
