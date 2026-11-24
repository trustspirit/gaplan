import { describe, expect, it } from 'vitest'
import { koreanTextsOf, withEnglishTexts } from './publicEnglish'

const view = {
  title: '1월 방문',
  calendarEvents: [{ title: '미군 지방부 대회', date: '2027-01-17' }, { title: 'Stake Conference', date: '2027-01-24' }],
  sundayStatus: {
    '2027-01-17': {
      busy: [{ kind: 'event', label: '미군 지방부 대회' }, { kind: 'schedule', label: '' }],
      notes: [{ title: '청년 대회' }],
      unitBlocks: { u1: '스테이크 대회' },
    },
  },
  regions: [{ id: 'r1', name: '서울 CC' }],
}

describe('koreanTextsOf', () => {
  it('collects each Korean text once, skipping English and empty ones', () => {
    expect(koreanTextsOf(view).sort()).toEqual(['미군 지방부 대회', '서울 CC', '스테이크 대회', '청년 대회'].sort())
  })
})

describe('withEnglishTexts', () => {
  it('swaps in the English it has and keeps the rest', () => {
    const out = withEnglishTexts(view, {
      '미군 지방부 대회': 'U.S. Military District Conference',
      '서울 CC': 'Seoul CC',
      '스테이크 대회': 'Stake Conference',
    })
    expect(out.calendarEvents.map((e) => e.title)).toEqual(['U.S. Military District Conference', 'Stake Conference'])
    expect(out.sundayStatus['2027-01-17'].busy.map((b) => b.label)).toEqual(['U.S. Military District Conference', ''])
    expect(out.sundayStatus['2027-01-17'].notes[0].title).toBe('청년 대회')
    expect(out.sundayStatus['2027-01-17'].unitBlocks.u1).toBe('Stake Conference')
    expect(out.regions[0]).toEqual({ id: 'r1', name: 'Seoul CC' })
    expect(out.title).toBe('1월 방문')
    expect(out.calendarEvents[0].date).toBe('2027-01-17')
  })
})
