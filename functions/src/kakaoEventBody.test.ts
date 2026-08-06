import { describe, it, expect } from 'vitest'
import {
  toKakaoTime,
  truncateTitle,
  buildKakaoDescription,
  buildKakaoEventBody,
  needsKakaoUpdate,
} from './kakaoEventBody'

describe('toKakaoTime', () => {
  it('KST 벽시계 값을 UTC ISO8601로 바꾼다', () => {
    expect(toKakaoTime('2026-08-09', '10:00')).toBe('2026-08-09T01:00:00Z')
  })

  it('자정 이전 시각은 전날 UTC가 된다', () => {
    expect(toKakaoTime('2026-08-09', '08:00')).toBe('2026-08-08T23:00:00Z')
  })

  it('밀리초를 포함하지 않는다', () => {
    expect(toKakaoTime('2026-08-09', '10:00')).not.toMatch(/\.\d{3}/)
  })
})

describe('truncateTitle', () => {
  it('50자 이하는 그대로 둔다', () => {
    expect(truncateTitle('짧은 제목')).toBe('짧은 제목')
  })

  it('50자를 넘으면 50자로 자른다', () => {
    const long = 'ㄱ'.repeat(60)
    expect(truncateTitle(long)).toHaveLength(50)
  })

  it('정확히 50자는 자르지 않는다', () => {
    const exact = 'ㄱ'.repeat(50)
    expect(truncateTitle(exact)).toBe(exact)
  })

  it('이모지가 경계에 걸려도 쪼개지 않는다', () => {
    const title = 'ㄱ'.repeat(49) + '😀'
    const result = truncateTitle(title)
    expect(Array.from(result)).toHaveLength(50)
    expect(result.endsWith('😀')).toBe(true)
  })

  it('이모지가 한계를 넘으면 통째로 잘라낸다', () => {
    const title = 'ㄱ'.repeat(50) + '😀'
    expect(truncateTitle(title)).toBe('ㄱ'.repeat(50))
  })
})

describe('buildKakaoDescription', () => {
  it('칠십인 · 줌 · 메모를 순서대로 줄바꿈으로 잇는다', () => {
    expect(
      buildKakaoDescription({
        seventyName: '박경렬',
        zoomLink: 'https://zoom.example/1',
        notes: '감독: 이윤학 (010-4149-7611)',
      }),
    ).toBe('담당 칠십인: 박경렬\n줌: https://zoom.example/1\n감독: 이윤학 (010-4149-7611)')
  })

  it('있는 항목만 넣는다', () => {
    expect(buildKakaoDescription({ seventyName: '박경렬', notes: '메모' })).toBe(
      '담당 칠십인: 박경렬\n메모',
    )
  })

  it('셋 다 없으면 undefined를 돌려준다', () => {
    expect(buildKakaoDescription({})).toBeUndefined()
  })

  it('공백뿐인 줌 링크와 메모는 없는 것으로 본다', () => {
    expect(buildKakaoDescription({ zoomLink: '   ', notes: '  ' })).toBeUndefined()
  })

  it('앞뒤 공백을 잘라낸다', () => {
    expect(buildKakaoDescription({ zoomLink: '  https://z  ' })).toBe('줌: https://z')
  })
})

describe('buildKakaoEventBody', () => {
  const SCHEDULE = {
    type: 'ward_visit',
    unitId: 'seoul-east-stake',
    wardName: '교문 와드',
    date: '2026-08-09',
    startTime: '10:00',
    endTime: '12:00',
    zoomLink: null,
    notes: null,
  }

  it('제목 · 시각 · 타임존을 채운다', () => {
    const body = buildKakaoEventBody({ schedule: SCHEDULE })
    expect(body.title).toContain('교문 와드 방문')
    expect(body.time.start_at).toBe('2026-08-09T01:00:00Z')
    expect(body.time.end_at).toBe('2026-08-09T03:00:00Z')
    expect(body.time.time_zone).toBe('Asia/Seoul')
  })

  it('설명이 없으면 description 키 자체를 넣지 않는다', () => {
    const body = buildKakaoEventBody({ schedule: SCHEDULE })
    expect(body).not.toHaveProperty('description')
  })

  it('칠십인 이름이 있으면 설명에 넣는다', () => {
    const body = buildKakaoEventBody({ schedule: SCHEDULE, seventyName: '박경렬' })
    expect(body.description).toBe('담당 칠십인: 박경렬')
  })

  it('제목이 길면 50자로 자른다', () => {
    const body = buildKakaoEventBody({
      schedule: { ...SCHEDULE, customTitle: 'ㄱ'.repeat(80) },
    })
    expect(body.title).toHaveLength(50)
  })
})

describe('needsKakaoUpdate', () => {
  const AFTER = {
    date: '2026-08-09',
    startTime: '10:00',
    endTime: '12:00',
    zoomLink: null,
    customTitle: null,
    unitId: 'seoul-east-stake',
    wardName: '교문 와드',
    notes: null,
  }

  it('before가 없으면 항상 true', () => {
    expect(needsKakaoUpdate(undefined, AFTER)).toBe(true)
  })

  it('동일하면 false', () => {
    expect(needsKakaoUpdate({ ...AFTER }, AFTER)).toBe(false)
  })

  it('동기화 대상이 아닌 필드만 바뀌면 false', () => {
    expect(needsKakaoUpdate({ ...AFTER, updatedBy: 'someone' }, { ...AFTER, updatedBy: 'other' })).toBe(false)
  })

  it.each([
    ['date', '2026-08-10'],
    ['startTime', '11:00'],
    ['endTime', '13:00'],
    ['zoomLink', 'https://z'],
    ['customTitle', '새 제목'],
    ['unitId', 'seoul-stake'],
    ['wardName', '녹번 와드'],
    ['notes', '새 메모'],
  ])('%s가 바뀌면 true', (field, value) => {
    expect(needsKakaoUpdate({ ...AFTER }, { ...AFTER, [field]: value })).toBe(true)
  })

  it('undefined와 null을 같은 값으로 본다', () => {
    expect(needsKakaoUpdate({ ...AFTER, zoomLink: undefined }, { ...AFTER, zoomLink: null })).toBe(false)
  })

  it('unitId는 undefined와 빈 문자열을 같은 값으로 본다 (calendarSync.ts와 동일)', () => {
    expect(needsKakaoUpdate({ ...AFTER, unitId: undefined }, { ...AFTER, unitId: '' })).toBe(false)
  })
})
