import { REGIONS, getUnitsByRegion } from '@/constants/regions'
import type { PublicScopeState } from '@/services/publicLinkService'

export interface SharingRow {
  scopeId: string
  nameKo: string
  /** 0 = 지역 자체, 1 = 그 아래 스테이크/지방부 */
  depth: 0 | 1
  enabled: boolean
  token: string
}

export interface SharingGroup {
  regionId: string
  nameKo: string
  rows: SharingRow[]
}

function rowFor(
  scopeId: string,
  nameKo: string,
  depth: 0 | 1,
  states: Record<string, PublicScopeState>,
): SharingRow {
  const state = states[scopeId]
  return { scopeId, nameKo, depth, enabled: state?.enabled === true, token: state?.token ?? '' }
}

/**
 * 지역 하나가 그룹 하나다. 그룹의 첫 행은 언제나 지역 자체이고, 그 뒤에 그 지역의
 * 단위들이 온다. 켜진 단위가 위로 오지만(스펙 §4.3) 지역 행은 머리 자리에 고정이다 —
 * 지역이 정렬에 섞이면 그룹의 제목이 가운데로 내려간다.
 */
export function buildSharingGroups(states: Record<string, PublicScopeState>): SharingGroup[] {
  return REGIONS.map((region) => {
    const units = getUnitsByRegion(region.id)
      .map((unit) => rowFor(unit.id, unit.name.ko, 1, states))
      .sort((a, b) => Number(b.enabled) - Number(a.enabled))
    return {
      regionId: region.id,
      nameKo: region.name,
      rows: [rowFor(region.id, region.name, 0, states), ...units],
    }
  })
}

/**
 * 검색어와 「활성만」을 함께 건다. 남는 행이 없는 그룹은 통째로 사라진다 —
 * 제목만 남은 빈 그룹이 수십 개 쌓이면 필터가 아무 일도 안 한 것처럼 보인다.
 */
export function filterSharingGroups(
  groups: SharingGroup[],
  query: string,
  activeOnly: boolean,
): SharingGroup[] {
  const q = query.trim().toLowerCase()
  return groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) => (!q || row.nameKo.toLowerCase().includes(q)) && (!activeOnly || row.enabled),
      ),
    }))
    .filter((group) => group.rows.length > 0)
}

export function countActive(groups: SharingGroup[]): { active: number; total: number } {
  const rows = groups.flatMap((group) => group.rows)
  return { active: rows.filter((row) => row.enabled).length, total: rows.length }
}
