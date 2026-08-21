import { buildSharingGroups, filterSharingGroups, countActive } from './sharingRows'

const OFF = { enabled: false, token: '' }

describe('buildSharingGroups', () => {
  it('puts every region first in its own group', () => {
    const groups = buildSharingGroups({})
    expect(groups.length).toBeGreaterThan(0)
    for (const g of groups) {
      expect(g.rows[0].scopeId, g.regionId).toBe(g.regionId)
      expect(g.rows[0].depth, g.regionId).toBe(0)
    }
  })

  it('marks the units under a region as nested', () => {
    const groups = buildSharingGroups({})
    const seoul = groups.find((g) => g.regionId === 'seoul')!
    expect(seoul.rows.slice(1).every((r) => r.depth === 1)).toBe(true)
  })

  it('carries the stored state onto the row it belongs to', () => {
    const groups = buildSharingGroups({ 'seoul-stake': { enabled: true, token: 'tok1' } })
    const row = groups.flatMap((g) => g.rows).find((r) => r.scopeId === 'seoul-stake')!
    expect(row.enabled).toBe(true)
    expect(row.token).toBe('tok1')
  })

  it('treats a scope with no stored state as off', () => {
    const groups = buildSharingGroups({})
    const row = groups.flatMap((g) => g.rows).find((r) => r.scopeId === 'seoul-stake')!
    expect(row.enabled).toBe(false)
    expect(row.token).toBe('')
  })

  // 켜진 것이 위로 온다(스펙 §4.3). 지역 행은 그룹의 머리이므로 정렬에서 빠진다.
  // military-district 는 UNITS_SEOUL 의 마지막 항목이다 — 켜지면 맨 위로 올라와야 한다.
  it('floats the enabled units to the top of their region', () => {
    const groups = buildSharingGroups({ 'military-district': { enabled: true, token: 't' } })
    const seoul = groups.find((g) => g.regionId === 'seoul')!
    expect(seoul.rows[0].scopeId).toBe('seoul')
    expect(seoul.rows[1].scopeId).toBe('military-district')
  })
})

describe('filterSharingGroups', () => {
  it('keeps a region whose own name matches', () => {
    const groups = filterSharingGroups(buildSharingGroups({}), '서울', false)
    expect(groups.map((g) => g.regionId)).toContain('seoul')
  })

  // '강릉'은 강릉 지방부에만 있고 지역 이름('서울 CC')에는 없다. 그러므로 서울 그룹은
  // 살아남되 그 안에 남는 행은 강릉 하나뿐이다 — 지역 행도 검색에 걸리지 않으면 사라진다.
  it('keeps a region because one of its units matches, and drops the others', () => {
    const groups = filterSharingGroups(buildSharingGroups({}), '강릉', false)
    const seoul = groups.find((g) => g.regionId === 'seoul')!
    expect(seoul.rows.map((r) => r.scopeId)).toEqual(['gangneung-district'])
  })

  it('drops a group entirely when nothing in it matches', () => {
    const groups = filterSharingGroups(buildSharingGroups({}), 'zzzz', false)
    expect(groups).toEqual([])
  })

  it('keeps only the enabled rows when active-only is on', () => {
    const built = buildSharingGroups({ 'seoul-stake': { enabled: true, token: 't' } })
    const groups = filterSharingGroups(built, '', true)
    expect(groups.flatMap((g) => g.rows).map((r) => r.scopeId)).toEqual(['seoul-stake'])
  })

  it('ignores whitespace around the query', () => {
    const bare = filterSharingGroups(buildSharingGroups({}), '강릉', false)
    const padded = filterSharingGroups(buildSharingGroups({}), '  강릉  ', false)
    expect(padded).toEqual(bare)
  })

  it('keeps everything when the query is empty', () => {
    const all = buildSharingGroups({})
    expect(filterSharingGroups(all, '', false)).toEqual(all)
  })
})

describe('countActive', () => {
  it('counts every row across every group', () => {
    const built = buildSharingGroups({
      'seoul-stake': { enabled: true, token: 't' },
      'busan-stake': { enabled: true, token: 't2' },
    })
    const { active, total } = countActive(built)
    expect(active).toBe(2)
    expect(total).toBe(built.flatMap((g) => g.rows).length)
  })

  it('counts nothing when everything is off', () => {
    expect(countActive(buildSharingGroups({ 'seoul-stake': OFF })).active).toBe(0)
  })
})
