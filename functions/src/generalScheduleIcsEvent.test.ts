import { describe, it, expect } from 'vitest'
import { buildGeneralScheduleVEvent } from './generalScheduleIcsEvent'

const DTSTAMP = '20260822T000000Z'

describe('buildGeneralScheduleVEvent', () => {
  it('시간이 있으면 타임존 있는 DTSTART/DTEND를 쓴다', () => {
    const vevent = buildGeneralScheduleVEvent(
      { id: 'g1', title: '스테이크 대회', date: '2026-09-01', startTime: '10:00', endTime: '12:00' },
      DTSTAMP,
    )
    expect(vevent).toContain('DTSTART;TZID=Asia/Seoul:20260901T100000')
    expect(vevent).toContain('DTEND;TZID=Asia/Seoul:20260901T120000')
    expect(vevent).not.toContain('VALUE=DATE')
  })

  // 브리프 §3: startTime/endTime이 없는 행사는 종일 이벤트로 만든다.
  it('시간이 없으면 종일(VALUE=DATE) 형식을 쓰고 DTEND를 넣지 않는다', () => {
    const vevent = buildGeneralScheduleVEvent(
      { id: 'g2', title: '금식 주일', date: '2026-09-06' },
      DTSTAMP,
    )
    expect(vevent).toContain('DTSTART;VALUE=DATE:20260906')
    expect(vevent).not.toContain('DTEND')
    expect(vevent).not.toContain('TZID')
  })

  it('제목을 SUMMARY로 싣고 콤마·세미콜론을 이스케이프한다', () => {
    const vevent = buildGeneralScheduleVEvent(
      { id: 'g3', title: '컨퍼런스, 강당; 2부', date: '2026-09-01' },
      DTSTAMP,
    )
    expect(vevent).toContain('SUMMARY:컨퍼런스\\, 강당\\; 2부')
  })

  // UID는 schedules의 VEVENT(`${id}@gaplan`)와 절대 충돌하면 안 된다.
  it('UID에 general- 접두사를 붙인다', () => {
    const vevent = buildGeneralScheduleVEvent(
      { id: 'abc123', title: 't', date: '2026-09-01' },
      DTSTAMP,
    )
    expect(vevent).toContain('UID:general-abc123@gaplan')
  })

  it('DTSTAMP를 그대로 싣는다', () => {
    const vevent = buildGeneralScheduleVEvent(
      { id: 'g4', title: 't', date: '2026-09-01' },
      DTSTAMP,
    )
    expect(vevent).toContain(`DTSTAMP:${DTSTAMP}`)
  })

  it('BEGIN/END:VEVENT로 감싼다', () => {
    const vevent = buildGeneralScheduleVEvent(
      { id: 'g5', title: 't', date: '2026-09-01' },
      DTSTAMP,
    )
    expect(vevent.startsWith('BEGIN:VEVENT')).toBe(true)
    expect(vevent.endsWith('END:VEVENT')).toBe(true)
  })
})

// event-toast-and-multiday brief 컨텍스트: generalScheduleEventBody.ts(구글 캘린더
// 동기화)는 이미 endDate를 받아 종일 이벤트의 배타적 end를 계산한다 — 그 형제인 이
// ICS 빌더도 같은 필드를 받아야 공개 ICS 피드에서도 여러 날 행사가 하루로 잘리지
// 않는다.
describe('a general schedule spanning multiple days (endDate)', () => {
  it('종일 이벤트에 endDate가 있으면 DTEND를 종료일 다음 날로 넣는다(배타적)', () => {
    const vevent = buildGeneralScheduleVEvent(
      { id: 'g6', title: '수련회', date: '2026-09-03', endDate: '2026-09-04' },
      DTSTAMP,
    )
    expect(vevent).toContain('DTSTART;VALUE=DATE:20260903')
    expect(vevent).toContain('DTEND;VALUE=DATE:20260905')
  })

  it('월 경계를 넘는 endDate도 올바르게 다음 날로 넘어간다', () => {
    const vevent = buildGeneralScheduleVEvent(
      { id: 'g7', title: '행사', date: '2026-08-30', endDate: '2026-08-31' },
      DTSTAMP,
    )
    expect(vevent).toContain('DTEND;VALUE=DATE:20260901')
  })

  it('endDate가 없는 종일 이벤트는 예전처럼 DTEND를 넣지 않는다(하루짜리)', () => {
    const vevent = buildGeneralScheduleVEvent(
      { id: 'g8', title: '금식 주일', date: '2026-09-06' },
      DTSTAMP,
    )
    expect(vevent).not.toContain('DTEND')
  })

  it('endDate가 date와 같거나 이르면(깨진 데이터) DTEND를 넣지 않는다', () => {
    const vevent = buildGeneralScheduleVEvent(
      { id: 'g9', title: '행사', date: '2026-09-06', endDate: '2026-09-01' },
      DTSTAMP,
    )
    expect(vevent).not.toContain('DTEND')
  })
})

// DTEND가 없으면 RFC 5545상 길이 0인 이벤트가 되고 클라이언트마다 다르게 그려진다.
describe('a general schedule with a start time but no end time', () => {
  it('still emits a DTEND, two hours after the start', () => {
    const text = buildGeneralScheduleVEvent(
      { id: 'e1', title: '스테이크 대회', date: '2026-09-03', startTime: '09:00' },
      '20260901T000000Z',
    )
    expect(text).toContain('DTSTART;TZID=Asia/Seoul:20260903T090000')
    expect(text).toContain('DTEND;TZID=Asia/Seoul:20260903T110000')
  })
})
