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
})
