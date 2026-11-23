import type { VisitRequest } from '@/types'
import type { SundayStatus } from '../../functions/src/visitSundayAvailability'

export type UnitSundayBlock = 'otherRegion' | 'busy' | 'unitBlocked' | 'decidedOther'

export interface UnitSundayOption {
  date: string
  /** 고를 수 없으면 그 이유, 고를 수 있으면 null */
  block: UnitSundayBlock | null
  selected: boolean
}

/**
 * 스테이크 하나의 링크에 넣을 수 있는 일요일. 요청의 「방문 가능한 일요일」을 모두 돌려주되,
 * 고를 수 있는 것은 그 스테이크가 가능한 날뿐이다:
 *   - 그 스테이크 CC 차례가 아닌 날(서버 sundaysForUnit도 뺀다)
 *   - 칠십인이 못 오게 된 날, 그 스테이크가 대회·행사로 막힌 날, 다른 스테이크로 이미 확정된 날
 * 칠십인이 고른 적이 없으면 고를 수 있는 날을 모두 넣는다.
 */
export function unitSundayOptions(
  request: Pick<VisitRequest, 'sundays' | 'units' | 'sundayRegions' | 'unitSundays' | 'decisions'>,
  unitId: string,
  status: Record<string, SundayStatus>,
): UnitSundayOption[] {
  const regionId = request.units.find((u) => u.id === unitId)?.regionId
  const turns = request.sundayRegions ?? {}
  const chosen = request.unitSundays?.[unitId]
  const chosenSet = chosen ? new Set(chosen) : null
  return [...request.sundays]
    .sort()
    .map((date) => {
      const decision = request.decisions?.[date]
      const st = status[date]
      const block: UnitSundayBlock | null =
        turns[date] && turns[date] !== regionId
          ? 'otherRegion'
          : decision && decision.unitId !== unitId
          ? 'decidedOther'
          : st && st.busy.length > 0
            ? 'busy'
            : st && unitId in st.unitBlocks
              ? 'unitBlocked'
              : null
      return { date, block, selected: block === null && (chosenSet ? chosenSet.has(date) : true) }
    })
}
