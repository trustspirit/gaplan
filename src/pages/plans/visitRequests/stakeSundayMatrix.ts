import type { RequestUnit, WardVisitStat } from '../../../../functions/src/visitRequestLogic'
import type { SundayRoles } from '../../../../functions/src/visitPlanBalance'
import {
  regionOfSunday,
  unitSundayOptions,
  type UnitSundayBlock,
  type UnitSundayRequest,
} from '../../../../functions/src/unitSundays'
import type { SundayStatus } from '../../../../functions/src/visitSundayAvailability'

/** 표의 칸 하나 — 그 스테이크에 그 일요일을 묻는가, 묻는다면 어떤 자리로 */
export type MatrixCell =
  | { kind: 'primary' | 'backup' | 'asked' | 'decided' | 'none' }
  | { kind: 'blocked'; block: UnitSundayBlock }

export interface MatrixRow {
  unit: RequestUnit
  /** 그 스테이크 와드들 중 가장 최근 방문 — 추천 순서의 기준 */
  lastVisit: string | null
  /** 가장 가까운 예정 방문 */
  nextVisit: string | null
  cells: Record<string, MatrixCell>
  primary: number
  backup: number
  /** 묻는 일요일 수(1순위·예비·직접 넣은 날) */
  total: number
}

export interface PlanMatrix {
  sundays: string[]
  /** date -> 그날 CC. 정할 수 없으면 undefined */
  regionOf: Record<string, string | undefined>
  /** 같은 CC의 스테이크끼리 붙여 둔다 */
  rows: MatrixRow[]
}

const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b)
const sooner = (a: string | null, b: string | null) => (!a ? b : !b ? a : a < b ? a : b)

/**
 * 스테이크 × 일요일 배정 표. 칩을 고친 결과까지 보이도록 「묻는다」는 unitSundayOptions의 selected를 따르고,
 * 1순위·예비 표시는 추천 배정(roles)에서 가져온다.
 */
export function planMatrix(input: {
  request: UnitSundayRequest
  roles: Record<string, SundayRoles>
  status: Record<string, SundayStatus>
  wardStats: Record<string, WardVisitStat>
}): PlanMatrix {
  const { request, roles, status, wardStats } = input
  const sundays = [...request.sundays].sort()
  const decisions = request.decisions ?? {}

  const regionOrder = [...new Set(request.units.map((u) => u.regionId ?? ''))]
  const units = [...request.units].sort(
    (a, b) => regionOrder.indexOf(a.regionId ?? '') - regionOrder.indexOf(b.regionId ?? ''),
  )

  const rows = units.map((u): MatrixRow => {
    const options = new Map(unitSundayOptions(request, u.id, status).map((o) => [o.date, o]))
    const cells: Record<string, MatrixCell> = {}
    let primary = 0
    let backup = 0
    let total = 0
    for (const date of sundays) {
      const o = options.get(date)
      let cell: MatrixCell
      if (decisions[date]?.unitId === u.id) cell = { kind: 'decided' }
      else if (o?.block) cell = { kind: 'blocked', block: o.block }
      else if (!o?.selected) cell = { kind: 'none' }
      else if (roles[date]?.primary === u.id) cell = { kind: 'primary' }
      else if (roles[date]?.backup === u.id) cell = { kind: 'backup' }
      else cell = { kind: 'asked' }
      if (cell.kind === 'primary') primary++
      if (cell.kind === 'backup') backup++
      if (cell.kind === 'primary' || cell.kind === 'backup' || cell.kind === 'asked') total++
      cells[date] = cell
    }
    const lastVisit = u.wards.reduce<string | null>((acc, w) => later(acc, wardStats[w.id]?.lastVisit ?? null), null)
    const nextVisit = u.wards.reduce<string | null>((acc, w) => sooner(acc, wardStats[w.id]?.nextVisit ?? null), null)
    return { unit: u, lastVisit, nextVisit, cells, primary, backup, total }
  })

  return {
    sundays,
    regionOf: Object.fromEntries(sundays.map((d) => [d, regionOfSunday(request, d)])),
    rows,
  }
}
