import { describe, it, expect } from 'vitest'
import { generalScheduleInScope } from './generalScheduleScope'

describe('generalScheduleInScope', () => {
  // 규칙 1: 전체 공개는 항상 true
  it('전체 공개(scopeRegionId===null)는 대상 지정과 무관하게 항상 true', () => {
    expect(
      generalScheduleInScope({ targetRegionIds: ['busan'], targetUnitIds: ['busan-stake'] }, null, null),
    ).toBe(true)
  })

  it('전체 공개는 대상이 없는 조직 전체 행사도 true', () => {
    expect(generalScheduleInScope({}, null, null)).toBe(true)
  })

  // 규칙 2: 대상이 하나도 없으면 조직 전체 행사 → 모든 CC에서 true
  it('targetRegionIds/targetUnitIds 둘 다 없으면(undefined) CC 스코프에서도 true', () => {
    expect(generalScheduleInScope({}, 'seoul', ['seoul-stake'])).toBe(true)
  })

  it('targetRegionIds/targetUnitIds 둘 다 빈 배열이면 CC 스코프에서도 true', () => {
    expect(
      generalScheduleInScope({ targetRegionIds: [], targetUnitIds: [] }, 'seoul', ['seoul-stake']),
    ).toBe(true)
  })

  // 규칙 3: targetRegionIds가 scopeRegionId를 포함하면 true
  it('targetRegionIds가 이 CC를 포함하면 true', () => {
    expect(
      generalScheduleInScope({ targetRegionIds: ['seoul'] }, 'seoul', ['seoul-stake']),
    ).toBe(true)
  })

  it('targetRegionIds가 다른 CC만 포함하면 false', () => {
    expect(
      generalScheduleInScope({ targetRegionIds: ['busan'] }, 'seoul', ['seoul-stake']),
    ).toBe(false)
  })

  // 규칙 4: targetUnitIds와 scopeUnitIds가 겹치면 true
  it('targetUnitIds가 이 CC의 유닛과 겹치면 true', () => {
    expect(
      generalScheduleInScope({ targetUnitIds: ['seoul-stake'] }, 'seoul', ['seoul-stake', 'seoul-east-stake']),
    ).toBe(true)
  })

  it('targetUnitIds가 다른 CC의 유닛만 지정하면 false', () => {
    expect(
      generalScheduleInScope({ targetUnitIds: ['busan-stake'] }, 'seoul', ['seoul-stake', 'seoul-east-stake']),
    ).toBe(false)
  })

  // 규칙 5: 그 외
  it('targetRegionIds도 targetUnitIds도 이 CC와 무관하면 false', () => {
    expect(
      generalScheduleInScope(
        { targetRegionIds: ['busan'], targetUnitIds: ['busan-stake'] },
        'seoul',
        ['seoul-stake', 'seoul-east-stake'],
      ),
    ).toBe(false)
  })

  // 경계: 다른 CC의 targetRegionIds와, 이 CC에 속하지 않는 targetUnitIds가 섞인 경우도 false
  it('여러 다른 CC를 지정해도 이 CC가 없으면 false', () => {
    expect(
      generalScheduleInScope(
        { targetRegionIds: ['busan', 'seoul-south'] },
        'seoul',
        ['seoul-stake'],
      ),
    ).toBe(false)
  })

  // 지역과 유닛을 함께 지정하면 교집합으로 좁힌다 — 합집합이 아니다.
  describe('지역과 유닛을 함께 지정한 경우', () => {
    it('지역과 유닛이 둘 다 맞으면 true', () => {
      expect(
        generalScheduleInScope(
          { targetRegionIds: ['seoul'], targetUnitIds: ['seoul-stake'] },
          'seoul',
          ['seoul-stake', 'seoul-east-stake'],
        ),
      ).toBe(true)
    })

    // 서울 CC + 경기 스테이크(실제로는 서울남 CC 소속)처럼 모순된 지정은 어느 쪽에도 실리지 않는다.
    it('지역은 맞지만 유닛이 이 CC에 없으면 false', () => {
      expect(
        generalScheduleInScope(
          { targetRegionIds: ['seoul'], targetUnitIds: ['gyeonggi-stake'] },
          'seoul',
          ['seoul-stake', 'seoul-east-stake'],
        ),
      ).toBe(false)
    })

    it('유닛은 이 CC에 있지만 지역이 다르면 false', () => {
      expect(
        generalScheduleInScope(
          { targetRegionIds: ['seoul'], targetUnitIds: ['gyeonggi-stake'] },
          'seoul-south',
          ['gyeonggi-stake', 'daejeon-stake'],
        ),
      ).toBe(false)
    })
  })

  // 유닛 하나만 공개한 링크: 호출부가 그 유닛의 CC를 scopeRegionId로 넘긴다.
  describe('유닛 스코프 링크', () => {
    it('지역만 지정한 CC 전체 행사는 그 CC의 유닛 링크에도 실린다', () => {
      expect(
        generalScheduleInScope({ targetRegionIds: ['seoul'] }, 'seoul', ['seoul-stake']),
      ).toBe(true)
    })

    it('지역과 유닛이 모두 맞으면 true', () => {
      expect(
        generalScheduleInScope(
          { targetRegionIds: ['seoul'], targetUnitIds: ['seoul-stake'] },
          'seoul',
          ['seoul-stake'],
        ),
      ).toBe(true)
    })

    it('같은 CC의 다른 유닛 행사는 false', () => {
      expect(
        generalScheduleInScope(
          { targetRegionIds: ['seoul'], targetUnitIds: ['seoul-east-stake'] },
          'seoul',
          ['seoul-stake'],
        ),
      ).toBe(false)
    })
  })
})
