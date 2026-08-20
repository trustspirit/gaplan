import { describe, it, expect } from 'vitest'
import { buildCcCouncilTitle, isKnownRegionId, isCcCouncilForScope } from './ccCouncil'
import { buildScheduleTitle } from './scheduleTitle'

describe('isKnownRegionId', () => {
  it('CC id만 통과시킨다', () => {
    expect(isKnownRegionId('seoul')).toBe(true)
    expect(isKnownRegionId('seoul-south')).toBe(true)
    expect(isKnownRegionId('busan')).toBe(true)
  })

  // 스테이크 id가 통과하면 unitId여야 할 값이 regionId 자리에 저장된다
  it('스테이크/지방부 id와 알 수 없는 값은 막는다', () => {
    expect(isKnownRegionId('seoul-stake')).toBe(false)
    expect(isKnownRegionId('ulsan-district')).toBe(false)
    expect(isKnownRegionId('__all__')).toBe(false)
    expect(isKnownRegionId('')).toBe(false)
  })
})

describe('buildCcCouncilTitle', () => {
  it('CC 이름에 협의 평의회를 붙인다', () => {
    expect(buildCcCouncilTitle('seoul')).toBe('서울 CC 협의 평의회')
    expect(buildCcCouncilTitle('seoul-south')).toBe('서울남 CC 협의 평의회')
    expect(buildCcCouncilTitle('busan')).toBe('부산 CC 협의 평의회')
  })

  it('이름을 모르면 CC 없이 일반 제목으로 떨어진다', () => {
    expect(buildCcCouncilTitle('nope')).toBe('협의 평의회')
  })
})

describe('isCcCouncilForScope', () => {
  const ccm = { targetKind: 'cc_council', regionId: 'seoul' }

  it('자기 CC 스코프에서만 통과한다', () => {
    expect(isCcCouncilForScope(ccm, 'seoul')).toBe(true)
    expect(isCcCouncilForScope(ccm, 'busan')).toBe(false)
  })

  // 지역 공유는 원래 와드 방문만 노출한다. 다른 모임까지 새면 안 된다.
  it('협의 평의회가 아닌 일정은 통과시키지 않는다', () => {
    expect(isCcCouncilForScope({ targetKind: 'stake_president', regionId: 'seoul' }, 'seoul')).toBe(false)
    expect(isCcCouncilForScope({ targetKind: 'cc_council' }, 'seoul')).toBe(false)
    expect(isCcCouncilForScope({}, 'seoul')).toBe(false)
  })
})

describe('buildScheduleTitle - 협의 평의회', () => {
  it('unitId가 없어도 CC 이름으로 제목을 만든다', () => {
    expect(buildScheduleTitle({ type: 'meeting', targetKind: 'cc_council', regionId: 'seoul' }))
      .toBe('서울 CC 협의 평의회')
  })

  it('사용자가 적은 제목이 있으면 그대로 쓴다', () => {
    expect(buildScheduleTitle({
      type: 'meeting', targetKind: 'cc_council', regionId: 'seoul', customTitle: '1분기 평의회',
    })).toBe('1분기 평의회')
  })

  it('일반 모임 제목 규칙은 그대로다', () => {
    expect(buildScheduleTitle({ type: 'meeting', unitId: 'seoul-stake' })).toBe('서울 스테이크 모임')
    expect(buildScheduleTitle({ type: 'interview', unitId: 'busan-stake' })).toBe('부산 스테이크 접견')
  })
})
