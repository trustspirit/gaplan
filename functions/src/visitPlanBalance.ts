/**
 * 방문 요청의 스테이크별 일요일 배정 — 추천(recommendUnitSundays)과 분포 점검(checkPlanBalance).
 * firebase를 import하지 않는 순수 모듈이라 클라이언트(만들기·상세 화면)와 서버(AI 검토)가 함께 쓴다.
 */
import type { RequestUnit, WardVisitStat } from './visitRequestLogic'
import { sundayWardPicks, type SundayWardPick } from './sundayWardPicks'
import { regionOfSunday, unitSundayOptions, type UnitSundayOption, type UnitSundayRequest } from './unitSundays'
import type { SundayStatus } from './visitSundayAvailability'

/** 일요일마다 추천한 스테이크. 칠십인 화면에서만 쓴다 — 회장 링크에는 구분 없이 일요일만 간다 */
export interface SundayRoles {
  primary?: string
  backup?: string
}

export interface UnitSundayPlan {
  /** unitId -> 그 스테이크 링크에 넣을 일요일. 모든 스테이크 키가 있고, 묻지 않으면 빈 배열 */
  unitSundays: Record<string, string[]>
  /** date -> 1순위/예비. 확정된 일요일은 없다 */
  roles: Record<string, SundayRoles>
  /** date -> 그날 우선 와드(만들기 화면 목록) */
  picks: Record<string, SundayWardPick[]>
}

const PICKS_PER_SUNDAY = 3

/**
 * 일요일마다 1순위와 예비(1순위와 다른 스테이크) 두 곳에 묻도록 배정한다.
 * 우선순위는 sundayWardPicks(방문 없거나 오래된 스테이크 → 그 안에서 방문 없거나 오래된 와드).
 * 확정된 일요일은 다시 고르지 않고 확정된 스테이크의 목록에 그대로 둔다 — 빼면 그 회장 링크에서 그날이 사라진다.
 */
export function recommendUnitSundays(input: {
  /** 배정할 일요일(칠십인이 막힌 날은 호출하는 쪽이 뺀다) */
  sundays: string[]
  request: {
    units: RequestUnit[]
    sundayRegions?: Record<string, string>
    decisions?: Record<string, { unitId: string }>
  }
  wardStats: Record<string, WardVisitStat>
  /** date -> (unitId -> 행사 제목). 그 스테이크가 막힌 일요일 */
  unitBlocks: Record<string, Record<string, string>>
  perSunday?: number
}): UnitSundayPlan {
  const { request } = input
  const decisions = request.decisions ?? {}
  const open = input.sundays.filter((d) => !decisions[d])
  // CC가 찍히지 않은 옛 스냅숏이면 모든 스테이크를 한 CC로 본다
  const noCc = request.units.every((u) => !u.regionId)
  const units = noCc ? request.units.map((u) => ({ ...u, regionId: '' })) : request.units
  const picks = sundayWardPicks({
    sundays: open,
    regionOf: (d) => (noCc ? '' : regionOfSunday(request, d)),
    units,
    wardStats: input.wardStats,
    unitBlocks: input.unitBlocks,
    perSunday: input.perSunday ?? PICKS_PER_SUNDAY,
  })

  const regionOf = (d: string) => (noCc ? '' : regionOfSunday(request, d))
  const asked = new Map<string, Set<string>>(request.units.map((u) => [u.id, new Set()]))
  const roles: Record<string, SundayRoles> = {}
  for (const date of open) {
    const list = picks[date] ?? []
    const primary = list[0]?.unitId
    if (!primary) continue
    const backup = list.find((p) => p.unitId !== primary)?.unitId
    roles[date] = backup ? { primary, backup } : { primary }
    asked.get(primary)?.add(date)
    if (backup) asked.get(backup)?.add(date)
  }
  // 일요일이 스테이크 수보다 적으면 최근에 방문받은 스테이크는 한 번도 안 물어보게 된다 — 예약 안 된 와드가 있는
  // 스테이크는 한 번은 예비로라도 묻는다. 예비를 가장 많이 받은 스테이크의 자리를 넘겨받는다.
  const freeWards = (u: RequestUnit) =>
    u.wards.filter((w) => !input.wardStats[w.id]?.nextVisit)
  for (const u of units) {
    if ((asked.get(u.id)?.size ?? 0) > 0) continue
    const free = freeWards(u)
    if (free.length === 0) continue
    const count = (id: string | undefined) => (id ? (asked.get(id)?.size ?? 0) : -1)
    const date = open
      .filter((d) => roles[d] && roles[d].primary !== u.id && regionOf(d) === u.regionId && !(u.id in (input.unitBlocks[d] ?? {})))
      .filter((d) => !roles[d].backup || count(roles[d].backup) > 1)
      .sort((x, y) => count(roles[y].backup) - count(roles[x].backup) || x.localeCompare(y))[0]
    if (!date) continue
    const old = roles[date].backup
    if (old) asked.get(old)?.delete(date)
    roles[date] = { ...roles[date], backup: u.id }
    asked.get(u.id)?.add(date)
    // 그날 목록에서도 예비 스테이크의 와드를 바꿔 둔다(만들기 화면이 보인다)
    const ward = [...free].sort((a, b) =>
      (input.wardStats[a.id]?.lastVisit ?? '').localeCompare(input.wardStats[b.id]?.lastVisit ?? ''))[0]
    const entry: SundayWardPick = {
      wardId: ward.id, wardName: ward.ko, unitId: u.id, unitName: u.ko,
      lastVisit: input.wardStats[ward.id]?.lastVisit ?? null,
    }
    const list = (picks[date] ?? []).filter((p) => p.unitId !== old)
    picks[date] = [list[0], entry, ...list.slice(1)].filter(Boolean).slice(0, input.perSunday ?? PICKS_PER_SUNDAY)
  }

  for (const date of input.sundays) {
    const d = decisions[date]
    if (d) asked.get(d.unitId)?.add(date)
  }

  return {
    unitSundays: Object.fromEntries([...asked].map(([id, dates]) => [id, [...dates].sort()])),
    roles,
    picks,
  }
}

export type BalanceKind =
  | 'sundayEmpty' | 'sundayCrowded' | 'sundayNoBackup'
  | 'unitMissing' | 'unitUrgentMissing' | 'unitOver' | 'regionShare'

/** 점검 결과 하나. 문구는 화면이 kind로 i18n(visitRequest.balance.<kind>)에서 고른다 */
export interface BalanceIssue {
  level: 'warn' | 'info'
  kind: BalanceKind
  date?: string
  unitId?: string
  regionId?: string
  count?: number
  min?: number
  max?: number
  expected?: number
}

/** 한 일요일에 묻는 스테이크 수 — 1순위와 예비 */
const ASKS_PER_SUNDAY = 2

/**
 * 스테이크마다 배정이 있는가. 칩 하나만 바꾼 이전 요청은 그 스테이크 키만 있고 나머지는
 * "모든 일요일"로 남는다 — 그런 요청은 아직 채우지 않은 것으로 본다(겹침 경고가 쏟아지지 않게).
 */
export function hasStakePlan(request: { units: { id: string }[]; unitSundays?: Record<string, string[]> }): boolean {
  const us = request.unitSundays
  return !!us && request.units.every((u) => Array.isArray(us[u.id]))
}

function monthsBefore(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const total = y * 12 + (m - 1) - months
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * 스테이크별 일요일 배정이 고르게 갔는지 본다. 칠십인이 칩을 바꿀 때마다 화면이 다시 부른다.
 * - 확정된 일요일과 칠십인이 막힌 일요일은 뺀다(이미 끝났거나 못 가는 날).
 * - "묻는다" = unitSundayOptions가 selected로 보는 날(그 스테이크가 가능하고 칠십인이 골라 둔 날).
 * - 스테이크 몫 = CC별 묻는 칸(일요일마다 열린 스테이크 수와 2 중 작은 것)을 와드 수 비례로 나눈 것.
 * 스테이크별 배정이 없는 이전 요청(unitSundays 없음)은 빈 결과 — 화면이 다시 채우기 안내를 대신 보인다.
 */
export function checkPlanBalance(input: {
  request: UnitSundayRequest
  status: Record<string, SundayStatus>
  wardStats: Record<string, WardVisitStat>
  today: string
}): BalanceIssue[] {
  const { request, status, wardStats, today } = input
  if (!hasStakePlan(request)) return []
  const decisions = request.decisions ?? {}
  const units = request.units
  const target = [...request.sundays].sort().filter((d) => !decisions[d] && !(status[d]?.busy.length))
  const options = new Map<string, Map<string, UnitSundayOption>>(
    units.map((u) => [u.id, new Map(unitSundayOptions(request, u.id, status).map((o) => [o.date, o]))]),
  )
  // 와드가 모두 방문 예정이면 물어볼 곳이 없다 — 열린 스테이크로 세지 않는다
  const hasFree = new Set(
    units.filter((u) => u.wards.some((w) => !wardStats[w.id]?.nextVisit)).map((u) => u.id),
  )
  const isOpen = (unitId: string, date: string) =>
    hasFree.has(unitId) && options.get(unitId)?.get(date)?.block === null
  const isAsked = (unitId: string, date: string) => options.get(unitId)?.get(date)?.selected === true
  const regionKey = (u: RequestUnit) => u.regionId ?? ''

  const issues: BalanceIssue[] = []
  const asked = new Map(units.map((u) => [u.id, 0]))
  const slots = new Map<string, number>()
  for (const date of target) {
    const open = units.filter((u) => isOpen(u.id, date))
    if (open.length === 0) continue
    const byRegion = new Map<string, number>()
    for (const u of open) byRegion.set(regionKey(u), (byRegion.get(regionKey(u)) ?? 0) + 1)
    for (const [r, n] of byRegion) slots.set(r, (slots.get(r) ?? 0) + Math.min(ASKS_PER_SUNDAY, n))

    const here = open.filter((u) => isAsked(u.id, date))
    for (const u of here) asked.set(u.id, (asked.get(u.id) ?? 0) + 1)
    if (here.length === 0) issues.push({ level: 'warn', kind: 'sundayEmpty', date })
    else if (here.length > ASKS_PER_SUNDAY) issues.push({ level: 'warn', kind: 'sundayCrowded', date, count: here.length })
    else if (here.length === 1 && open.length > 1) {
      issues.push({ level: 'info', kind: 'sundayNoBackup', date, unitId: here[0].id })
    }
  }

  const cutoff = monthsBefore(today, 12)
  const regionWards = new Map<string, number>()
  for (const u of units) regionWards.set(regionKey(u), (regionWards.get(regionKey(u)) ?? 0) + u.wards.length)
  for (const u of units) {
    const count = asked.get(u.id) ?? 0
    if (count === 0 && target.some((d) => isOpen(u.id, d))) {
      const urgent = u.wards.some((w) => {
        const st = wardStats[w.id]
        return !st?.nextVisit && (!st?.lastVisit || st.lastVisit < cutoff)
      })
      issues.push({ level: 'warn', kind: urgent ? 'unitUrgentMissing' : 'unitMissing', unitId: u.id })
      continue
    }
    const wards = regionWards.get(regionKey(u)) ?? 0
    if (wards === 0) continue
    const share = ((slots.get(regionKey(u)) ?? 0) * u.wards.length) / wards
    const max = Math.ceil(share) + 1
    if (count > max) issues.push({ level: 'info', kind: 'unitOver', unitId: u.id, count, min: Math.floor(share), max })
  }

  // CC를 둘 이상 맡았을 때: CC 차례가 와드 수에 비해 적은가
  const regions = [...regionWards.keys()].filter(Boolean)
  if (regions.length > 1) {
    const totalWards = [...regionWards.values()].reduce((a, b) => a + b, 0)
    for (const regionId of regions) {
      const count = request.sundays.filter((d) => regionOfSunday(request, d) === regionId).length
      const expected = Math.round((request.sundays.length * (regionWards.get(regionId) ?? 0)) / totalWards)
      if (count <= expected - 2) issues.push({ level: 'info', kind: 'regionShare', regionId, count, expected })
    }
  }

  const order = (i: BalanceIssue) => (i.level === 'warn' ? 0 : 1)
  return issues
    .map((issue, index) => ({ issue, index }))
    .sort((a, b) => order(a.issue) - order(b.issue) || a.index - b.index)
    .map((x) => x.issue)
}
