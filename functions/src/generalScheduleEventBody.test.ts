import { describe, it, expect } from 'vitest'
import { generalScheduleEventBody } from './generalScheduleEventBody'

describe('generalScheduleEventBody', () => {
  it('시간이 있으면 dateTime으로 만든다', () => {
    const body = generalScheduleEventBody({
      title: '지역 대회',
      date: '2026-09-01',
      startTime: '10:00',
      endTime: '12:00',
    })
    expect(body.summary).toBe('지역 대회')
    expect(body.start).toEqual({ dateTime: '2026-09-01T10:00:00+09:00', timeZone: 'Asia/Seoul' })
    expect(body.end).toEqual({ dateTime: '2026-09-01T12:00:00+09:00', timeZone: 'Asia/Seoul' })
  })

  it('설명이 있으면 그대로 싣는다', () => {
    const body = generalScheduleEventBody({
      title: '지역 대회',
      description: '준비물: 경전',
      date: '2026-09-01',
      startTime: '10:00',
      endTime: '12:00',
    })
    expect(body.description).toBe('준비물: 경전')
  })

  it('설명이 없으면 description을 아예 넣지 않는다', () => {
    const body = generalScheduleEventBody({ title: '금식 주일', date: '2026-09-06' })
    expect(body.description).toBeUndefined()
  })

  it('시간이 없으면 종일 이벤트(date)로 만들고 endDate가 없으면 하루짜리다', () => {
    const body = generalScheduleEventBody({ title: '금식 주일', date: '2026-09-06' })
    expect(body.start).toEqual({ date: '2026-09-06' })
    // 종일 이벤트의 end.date는 배타적이라 다음 날짜여야 그 날까지 표시된다.
    expect(body.end).toEqual({ date: '2026-09-07' })
  })

  it('endDate가 있으면 종료일 다음 날을 end.date로 쓴다(여러 날짜에 걸친 행사)', () => {
    const body = generalScheduleEventBody({ title: '스테이크 대회', date: '2026-09-01', endDate: '2026-09-03' })
    expect(body.start).toEqual({ date: '2026-09-01' })
    expect(body.end).toEqual({ date: '2026-09-04' })
  })

  it('월 경계를 넘는 endDate도 올바르게 다음 날로 넘어간다', () => {
    const body = generalScheduleEventBody({ title: '행사', date: '2026-08-30', endDate: '2026-08-31' })
    expect(body.end).toEqual({ date: '2026-09-01' })
  })
})

// 행사는 endTime이 선택이다. 시작만 있는 문서를 그대로 내보내면 길이 0짜리 이벤트가 되어
// 구글 캘린더에 점처럼 그려진다 — 폼이 자동으로 채우는 2시간과 같은 길이가 나와야 한다.
describe('a general schedule with a start time but no end time', () => {
  it('lasts the same two hours the form fills in, not zero minutes', () => {
    const body = generalScheduleEventBody({
      title: '스테이크 대회',
      date: '2026-09-03',
      startTime: '09:00',
    })
    expect(body.start).toEqual({ dateTime: '2026-09-03T09:00:00+09:00', timeZone: 'Asia/Seoul' })
    expect(body.end).toEqual({ dateTime: '2026-09-03T11:00:00+09:00', timeZone: 'Asia/Seoul' })
  })
})

// 1박 2일 행사에 시간이 있는 경우. 종료 날짜를 무시하면 둘째 날이 통째로 잘린다.
describe('a multi-day event that also has times', () => {
  it('ends on endDate, not on the start date', () => {
    const body = generalScheduleEventBody({
      title: '수련회',
      date: '2026-09-03',
      endDate: '2026-09-04',
      startTime: '19:00',
      endTime: '12:00',
    })
    expect(body.start).toEqual({ dateTime: '2026-09-03T19:00:00+09:00', timeZone: 'Asia/Seoul' })
    expect(body.end).toEqual({ dateTime: '2026-09-04T12:00:00+09:00', timeZone: 'Asia/Seoul' })
  })

  // 하루짜리에서는 종료가 시작보다 이르면 기본 길이로 대체되지만, 날짜가 다르면
  // 12:00 < 19:00 이어도 정상이다 — 시각만 비교해서 덮어쓰면 안 된다.
  it('does not treat an earlier clock time on a later day as broken', () => {
    const body = generalScheduleEventBody({
      title: '수련회',
      date: '2026-09-03',
      endDate: '2026-09-04',
      startTime: '19:00',
      endTime: '09:00',
    })
    expect(body.end).toEqual({ dateTime: '2026-09-04T09:00:00+09:00', timeZone: 'Asia/Seoul' })
  })
})
