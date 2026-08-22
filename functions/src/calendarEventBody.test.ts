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
