import { describe, it, expect } from 'vitest'
import {
  sundayAvailability, isFirstSunday, isGeneralConferenceSunday, isSundayBusy, publicCalendarEvents,
} from './visitSundayAvailability'

const base = {
  sundays: ['2027-01-10', '2027-01-17'],
  regionIds: ['seoul'],
  regionUnitIds: ['seoul-stake', 'seoul-east-stake'],
  schedules: [],
  events: [],
  blockedDates: [],
}

describe('sundayAvailability', () => {
  it('일정이 없으면 비어 있다', () => {
    const r = sundayAvailability(base)
    expect(isSundayBusy(r['2027-01-10'])).toBe(false)
    expect(r['2027-01-10'].notes).toEqual([])
  })

  it('칠십인 일정이 있으면(여러 날 모임 포함) 막고, 취소된 일정과 이 요청이 만든 일정은 뺀다', () => {
    const r = sundayAvailability({
      ...base,
      schedules: [
        { id: 'a', type: 'interview', status: 'confirmed', date: '2027-01-10', customTitle: '접견' },
        { id: 'b', type: 'meeting', status: 'pending', date: '2027-01-15', endDate: '2027-01-17' },
        { id: 'c', type: 'ward_visit', status: 'cancelled', date: '2027-01-17' },
        { id: 'vr', type: 'ward_visit', status: 'confirmed', date: '2027-01-10' },
      ],
      ignoreScheduleIds: new Set(['vr']),
    })
    expect(r['2027-01-10'].busy).toEqual([
      { kind: 'schedule', scheduleType: 'interview', label: '접견', publicLabel: false },
    ])
    expect(r['2027-01-17'].busy.map((b) => b.kind)).toEqual(['schedule'])
  })

  it('칠십인이 참석하는 행사·칠십인 전용 행사는 막고, 담당 지역과 무관한 행사는 무시한다', () => {
    const r = sundayAvailability({
      ...base,
      events: [
        { title: '서울 스테이크 대회', date: '2027-01-10', isPublic: true, seventyAttends: true, targetUnitIds: ['seoul-stake'] },
        { title: '부산 대회', date: '2027-01-17', isPublic: true, seventyAttends: true, targetRegionIds: ['busan'] },
        { title: '칠십인 모임', date: '2027-01-17', isPublic: false, seventyOnly: true },
      ],
    })
    expect(r['2027-01-10'].busy).toEqual([
      { kind: 'event', label: '서울 스테이크 대회', publicLabel: true },
    ])
    expect(r['2027-01-17'].busy).toEqual([{ kind: 'event', label: '칠십인 모임', publicLabel: false }])
  })

  it('특정 단위 대상의 대회/행사는 칠십인을 막지 않고 그 단위만 막는다', () => {
    const r = sundayAvailability({
      ...base,
      events: [
        { title: '서울동 스테이크 대회', category: 'conference', date: '2027-01-10', isPublic: true, targetUnitIds: ['seoul-east-stake'] },
        { title: '비공개 대회', category: 'conference', date: '2027-01-17', isPublic: false, targetUnitIds: ['seoul-stake'] },
      ],
    })
    expect(isSundayBusy(r['2027-01-10'])).toBe(false)
    expect(r['2027-01-10'].unitBlocks).toEqual({ 'seoul-east-stake': '서울동 스테이크 대회' })
    expect(r['2027-01-17'].unitBlocks).toEqual({ 'seoul-stake': '' })
  })

  it('담당 지역 전체·교회 전체 대상의 대회/행사는 모두를 막는다', () => {
    const r = sundayAvailability({
      ...base,
      events: [
        { title: '지역 대회', category: 'conference', date: '2027-01-10', isPublic: true, targetRegionIds: ['seoul'] },
        { title: '전체 금식', category: 'fasting', date: '2027-01-17', isPublic: true },
      ],
    })
    expect(r['2027-01-10'].busy).toEqual([{ kind: 'event', label: '지역 대회', publicLabel: true }])
    expect(r['2027-01-17'].busy.map((b) => b.kind)).toEqual(['event'])
  })

  it('그 밖의 공개 행사는 막지 않고 참고로 남긴다', () => {
    const r = sundayAvailability({
      ...base,
      events: [
        { title: '청년 활동', category: 'other', date: '2027-01-10', isPublic: true, targetUnitIds: ['seoul-stake'] },
        { title: '비공개 기타', category: 'other', date: '2027-01-10', isPublic: false },
      ],
    })
    expect(isSundayBusy(r['2027-01-10'])).toBe(false)
    expect(r['2027-01-10'].notes).toEqual([{ title: '청년 활동', unitIds: ['seoul-stake'] }])
  })

  it('금식 주일과 칠십인이 막아 둔 날은 막는다', () => {
    const r = sundayAvailability({ ...base, sundays: ['2027-02-07', '2027-02-14'], blockedDates: ['2027-02-14'] })
    expect(r['2027-02-07'].busy.map((b) => b.kind)).toEqual(['fast'])
    expect(r['2027-02-14'].busy.map((b) => b.kind)).toEqual(['blocked'])
  })
})

describe('isFirstSunday', () => {
  it('그 달의 1~7일 일요일이 첫 일요일이다', () => {
    expect(isFirstSunday('2027-02-07')).toBe(true)
    expect(isFirstSunday('2027-02-14')).toBe(false)
  })

  it('4월·10월은 첫 일요일이 금식 주일, 둘째 일요일이 연차 대회 시청 주일이다', () => {
    expect(isGeneralConferenceSunday('2027-04-04')).toBe(false)
    expect(isGeneralConferenceSunday('2027-04-11')).toBe(true)
    expect(isGeneralConferenceSunday('2026-10-11')).toBe(true)
    expect(isGeneralConferenceSunday('2027-04-18')).toBe(false)
    expect(isGeneralConferenceSunday('2027-05-09')).toBe(false)
    const r = sundayAvailability({ ...base, sundays: ['2027-04-04', '2027-04-11', '2027-04-18'] })
    expect(r['2027-04-04'].busy.map((b) => b.kind)).toEqual(['fast'])
    expect(r['2027-04-11'].busy.map((b) => b.kind)).toEqual(['generalConference'])
    expect(r['2027-04-18'].busy).toEqual([])
  })
})

describe('publicCalendarEvents', () => {
  it('담당 지역과 관련 있는 공개 행사만, 기간과 겹치는 것만 싣는다', () => {
    const out = publicCalendarEvents(
      [
        { title: '서울 스테이크 대회', category: 'conference', date: '2027-01-09', endDate: '2027-01-10', isPublic: true, targetUnitIds: ['seoul-stake'] },
        { title: '부산 행사', category: 'other', date: '2027-01-12', isPublic: true, targetRegionIds: ['busan'] },
        { title: '칠십인 모임', category: 'other', date: '2027-01-12', isPublic: false, seventyOnly: true },
        { title: '비공개', category: 'other', date: '2027-01-12', isPublic: false },
        { title: '지난 행사', category: 'other', date: '2026-11-01', isPublic: true },
        { title: '지역 대회', category: 'conference', date: '2027-01-24', isPublic: true, targetRegionIds: ['seoul'], seventyAttends: true },
      ],
      ['seoul'],
      ['seoul-stake', 'seoul-east-stake'],
      '2027-01-01',
      '2027-01-31',
    )
    expect(out).toEqual([
      { title: '서울 스테이크 대회', date: '2027-01-09', endDate: '2027-01-10', category: 'conference', unitIds: ['seoul-stake'], blocking: true, seventyAttends: false },
      { title: '지역 대회', date: '2027-01-24', endDate: null, category: 'conference', unitIds: null, blocking: true, seventyAttends: true },
    ])
  })
})
