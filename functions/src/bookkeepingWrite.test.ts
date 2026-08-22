import { describe, it, expect } from 'vitest'
import { isBookkeepingOnlyWrite } from './bookkeepingWrite'

const SCHEDULE = {
  status: 'confirmed',
  date: '2026-08-09',
  startTime: '10:00',
  endTime: '11:00',
  unitId: 'unit-1',
}

describe('isBookkeepingOnlyWrite', () => {
  // 트레이스: kakaoCalendarSync가 kakaoEventIds를 되쓰면 calendarSync가 깨어난다.
  // 이 write를 무시하지 않으면 구글 이벤트가 한 번 더 생성된다.
  it('장부 필드만 바뀌면 true', () => {
    expect(
      isBookkeepingOnlyWrite(SCHEDULE, { ...SCHEDULE, kakaoEventIds: { u1: 'e1' } }),
    ).toBe(true)
  })

  it('구글 이벤트 id만 바뀌어도 true', () => {
    expect(
      isBookkeepingOnlyWrite(SCHEDULE, { ...SCHEDULE, googleCalendarEventId: 'g1' }),
    ).toBe(true)
  })

  // generalScheduleCalendarSync가 되쓰는 필드. 이 목록에 없으면 그 트리거가 자기
  // 자신의 되쓰기로 무한히 재호출된다.
  it('generalScheduleCalendarSync의 googleCalendarEventIds(복수형)만 바뀌어도 true', () => {
    expect(
      isBookkeepingOnlyWrite(SCHEDULE, { ...SCHEDULE, googleCalendarEventIds: { seoul: 'e1' } }),
    ).toBe(true)
  })

  it('동기화 대상 필드가 함께 바뀌면 false', () => {
    expect(
      isBookkeepingOnlyWrite(SCHEDULE, {
        ...SCHEDULE,
        startTime: '14:00',
        kakaoEventIds: { u1: 'e1' },
      }),
    ).toBe(false)
  })

  it('장부와 무관한 필드가 바뀌면 false', () => {
    expect(isBookkeepingOnlyWrite(SCHEDULE, { ...SCHEDULE, updatedBy: 'admin-1' })).toBe(false)
  })

  it('before가 없으면(문서 생성) false', () => {
    expect(isBookkeepingOnlyWrite(undefined, SCHEDULE)).toBe(false)
  })

  it('after가 없으면(문서 삭제) false', () => {
    expect(isBookkeepingOnlyWrite(SCHEDULE, undefined)).toBe(false)
  })

  it('아무것도 바뀌지 않으면 true', () => {
    expect(isBookkeepingOnlyWrite(SCHEDULE, { ...SCHEDULE })).toBe(true)
  })

  it('중첩 객체의 내용이 바뀌면 false (참조 비교가 아니라 값 비교)', () => {
    expect(
      isBookkeepingOnlyWrite(
        { ...SCHEDULE, attendees: ['a'] },
        { ...SCHEDULE, attendees: ['a', 'b'] },
      ),
    ).toBe(false)
  })
})
