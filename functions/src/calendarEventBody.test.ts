import { describe, it, expect } from 'vitest'
import { buildCalendarEventFields } from './calendarEventBody'

describe('buildCalendarEventFields', () => {
  // 회귀 방지: 예전에는 location이 Zoom URL이었다. 링크를 잃으면 안 된다.
  it('Zoom 링크를 설명에 남긴다', () => {
    const f = buildCalendarEventFields({ location: '온라인 (Zoom)', zoomLink: 'https://zoom.us/j/1', notes: null })
    expect(f.location).toBe('온라인 (Zoom)')
    expect(f.description).toContain('https://zoom.us/j/1')
  })

  it('메모도 설명에 싣는다', () => {
    const f = buildCalendarEventFields({ location: '교문 와드', zoomLink: null, notes: '준비물 지참' })
    expect(f.description).toContain('준비물 지참')
  })

  // 빈 문자열은 구글에서 "지우기"를 뜻한다 — undefined(변경 없음)와 다르다.
  it('장소가 없으면 빈 문자열로 지운다', () => {
    expect(buildCalendarEventFields({ location: null, zoomLink: null, notes: null }).location).toBe('')
  })
})

import { googleEventTimes } from './calendarEventBody'

// 종일 일정은 시각 없이 날짜로 보낸다. 구글은 종일 이벤트의 end 날짜를 포함하지 않으므로
// 마지막 날 다음 날을 적어야 한다 — 그날 그대로 적으면 하루가 모자라게 표시된다.
describe('googleEventTimes', () => {
  it('시간이 있는 일정은 KST 시각으로 보낸다', () => {
    expect(googleEventTimes({ date: '2026-12-03', startTime: '10:00', endTime: '11:00' })).toEqual({
      start: { dateTime: '2026-12-03T10:00:00+09:00', timeZone: 'Asia/Seoul' },
      end: { dateTime: '2026-12-03T11:00:00+09:00', timeZone: 'Asia/Seoul' },
    })
  })

  it('여러 날 모임은 마지막 날의 종료 시각에 끝난다', () => {
    const times = googleEventTimes({ date: '2026-12-03', endDate: '2026-12-05', startTime: '18:00', endTime: '12:00' })
    expect(times.end).toEqual({ dateTime: '2026-12-05T12:00:00+09:00', timeZone: 'Asia/Seoul' })
  })

  it('종일 일정은 날짜로 보내고 end는 다음 날이다', () => {
    expect(
      googleEventTimes({ date: '2026-12-03', startTime: '00:00', endTime: '23:59', allDay: true }),
    ).toEqual({ start: { date: '2026-12-03' }, end: { date: '2026-12-04' } })
  })

  it('여러 날 종일 일정의 end는 마지막 날 다음 날이다', () => {
    expect(
      googleEventTimes({ date: '2026-12-03', endDate: '2026-12-05', startTime: '00:00', endTime: '23:59', allDay: true }),
    ).toEqual({ start: { date: '2026-12-03' }, end: { date: '2026-12-06' } })
  })
})
