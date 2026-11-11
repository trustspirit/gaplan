import dayjs from 'dayjs'
import type { Schedule } from '@/types'
import { ALL_UNITS, REGIONS, WARDS, type WardUnit } from '@/constants/regions'
import { isStakePresidentContact } from './reminders'
import { ACTIVE_STATUS, inRegionScope, inScheduleScope, periodStart, type StatsFilters } from './visitStats'

/**
 * 통계 페이지가 답해야 하는 질문들을 계산한다.
 *
 *   1. CC별로 방문이 고르게 갔는가          → regions
 *   2. 스테이크·와드별로 고르게 갔는가      → units (와드 칸 포함)
 *   3. 방문 계획을 세울 때 어디부터 갈 것인가 → priority
 *   4. 스테이크 회장 접견을 했는가          → interviews
 *
 * "고르게"의 기준은 방문 횟수가 아니라 **범위**(전체 와드 중 방문한 와드의 비율)다. CC마다 와드
 * 수가 달라서, 횟수만 보면 와드가 많은 CC가 늘 많이 간 것처럼 보인다.
 *
 * "방문"은 오늘까지 실제로 지난 방문만 센다. 앞으로 잡혀 있는 방문은 "예정"으로 따로 다룬다 —
 * 예전 통계는 예정된 방문까지 횟수에 넣어, 아직 가지 않은 곳이 간 것처럼 보였다.
 */

export interface WardCoverage {
  id: string
  name: string
  unitId: string
  /** 기간 안에 지난 방문 횟수 */
  visits: number
  /** 불러온 이력 전체에서 가장 최근에 지난 방문. 없으면 null */
  lastVisitDate: string | null
  /** 오늘 이후로 잡혀 있는 가장 가까운 방문. 없으면 null */
  nextVisitDate: string | null
}

export interface UnitCoverage {
  id: string
  name: string
  regionId: string
  regionName: string
  wardsTotal: number
  wardsVisited: number
  visits: number
  wards: WardCoverage[]
}

export interface RegionCoverage {
  id: string
  name: string
  wardsTotal: number
  wardsVisited: number
  visits: number
}

export interface WardPriority extends WardCoverage {
  unitName: string
  regionId: string
  /** 마지막 방문 이후 지난 날수. 방문 이력이 없으면 null */
  daysSince: number | null
}

export type QuarterContact = 'done' | 'scheduled' | 'none'

export interface InterviewQuarter {
  /** 'YYYY-Qn' */
  key: string
  start: string
  end: string
  isCurrent: boolean
  contact: QuarterContact
}

export interface UnitInterviewStatus {
  unitId: string
  unitName: string
  regionId: string
  regionName: string
  /** 오래된 분기부터 이번 분기까지 */
  quarters: InterviewQuarter[]
  /** 오늘까지 지난 접견 중 가장 최근. 없으면 null */
  lastContactDate: string | null
}

export interface VisitInsights {
  summary: {
    visits: number
    wardsTotal: number
    wardsVisited: number
    /** 불러온 이력 전체에서 한 번도 방문하지 않은 와드 수 */
    wardsNeverVisited: number
    interviewUnitsTotal: number
    /** 이번 분기에 스테이크 회장 접견을 이미 한 단위 수 */
    interviewUnitsDone: number
  }
  regions: RegionCoverage[]
  units: UnitCoverage[]
  priority: WardPriority[]
  interviews: UnitInterviewStatus[]
}

export const INTERVIEW_QUARTERS = 4

/**
 * 방문 일정이 가리키는 와드. wardId가 있으면 그것으로, 없으면(옛 문서) 같은 스테이크 안에서
 * 와드 이름으로 찾는다. 이름만으로 찾으면 다른 스테이크의 같은 이름 와드와 섞인다.
 */
function wardOf(s: Schedule, wardsById: Map<string, WardUnit>): WardUnit | undefined {
  if (s.wardId) {
    const byId = wardsById.get(s.wardId)
    if (byId) return byId
  }
  if (!s.wardName) return undefined
  return WARDS.find((w) => w.unitId === s.unitId && w.name.ko === s.wardName)
}

/** today가 속한 분기를 끝으로 하는 최근 n개 분기. 오래된 것부터. */
export function recentQuarters(today: string, n: number): { key: string; start: string; end: string }[] {
  const t = dayjs(today)
  const currentStart = t.month(Math.floor(t.month() / 3) * 3).startOf('month')
  return Array.from({ length: n }, (_, i) => {
    const start = currentStart.subtract((n - 1 - i) * 3, 'month')
    return {
      key: `${start.year()}-Q${Math.floor(start.month() / 3) + 1}`,
      start: start.format('YYYY-MM-DD'),
      end: start.add(2, 'month').endOf('month').format('YYYY-MM-DD'),
    }
  })
}

/**
 * @param allowedRegionIds null = 전체(관리자), 배열 = 그 지역만
 */
export function computeVisitInsights(
  schedules: Schedule[],
  filters: StatsFilters,
  allowedRegionIds: string[] | null,
  today: string,
  options: { actingSeventyUid?: string | null } = {},
): VisitInsights {
  const start = periodStart(filters.period, today)
  const scoped = schedules.filter(
    (s) =>
      ACTIVE_STATUS.includes(s.status) &&
      inScheduleScope(s, allowedRegionIds, filters.regionId, options.actingSeventyUid ?? null),
  )

  // ── 와드별: 기간 내 방문 횟수, 마지막 방문, 다음 예정 ──────────────────────────
  const wardsById = new Map(WARDS.map((w) => [w.id, w]))
  const visitsInPeriod = new Map<string, number>()
  const lastVisit = new Map<string, string>()
  const nextVisit = new Map<string, string>()
  for (const s of scoped) {
    if (s.type !== 'ward_visit') continue
    const ward = wardOf(s, wardsById)
    if (!ward) continue
    if (s.date <= today) {
      if (s.date >= start) visitsInPeriod.set(ward.id, (visitsInPeriod.get(ward.id) ?? 0) + 1)
      const prev = lastVisit.get(ward.id)
      if (!prev || s.date > prev) lastVisit.set(ward.id, s.date)
    } else {
      const prev = nextVisit.get(ward.id)
      if (!prev || s.date < prev) nextVisit.set(ward.id, s.date)
    }
  }

  const scopedUnits = ALL_UNITS.filter((u) => inRegionScope(u.regionId, allowedRegionIds, filters.regionId))
  const regionName = new Map(REGIONS.map((r) => [r.id, r.name]))

  const units: UnitCoverage[] = scopedUnits.map((u) => {
    const wards: WardCoverage[] = WARDS.filter((w) => w.unitId === u.id).map((w) => ({
      id: w.id,
      name: w.name.ko,
      unitId: u.id,
      visits: visitsInPeriod.get(w.id) ?? 0,
      lastVisitDate: lastVisit.get(w.id) ?? null,
      nextVisitDate: nextVisit.get(w.id) ?? null,
    }))
    return {
      id: u.id,
      name: u.name.ko,
      regionId: u.regionId,
      regionName: regionName.get(u.regionId) ?? u.regionId,
      wardsTotal: wards.length,
      wardsVisited: wards.filter((w) => w.visits > 0).length,
      visits: wards.reduce((sum, w) => sum + w.visits, 0),
      wards,
    }
  })

  const regions: RegionCoverage[] = REGIONS.filter((r) =>
    inRegionScope(r.id, allowedRegionIds, filters.regionId),
  ).map((r) => {
    const own = units.filter((u) => u.regionId === r.id)
    return {
      id: r.id,
      name: r.name,
      wardsTotal: own.reduce((sum, u) => sum + u.wardsTotal, 0),
      wardsVisited: own.reduce((sum, u) => sum + u.wardsVisited, 0),
      visits: own.reduce((sum, u) => sum + u.visits, 0),
    }
  })

  // ── 방문 우선순위: 한 번도 안 간 곳 → 가장 오래된 곳 ───────────────────────────
  const allWards = units.flatMap((u) =>
    u.wards.map<WardPriority>((w) => ({
      ...w,
      unitName: u.name,
      regionId: u.regionId,
      daysSince: w.lastVisitDate ? dayjs(today).diff(dayjs(w.lastVisitDate), 'day') : null,
    })),
  )
  const priority = [...allWards].sort((a, b) => {
    if (a.daysSince === null && b.daysSince === null) return a.name.localeCompare(b.name)
    if (a.daysSince === null) return -1
    if (b.daysSince === null) return 1
    return b.daysSince - a.daysSince || a.name.localeCompare(b.name)
  })

  // ── 접견 현황: 스테이크마다 최근 분기별 스테이크 회장 접견 ──────────────────────
  const quarters = recentQuarters(today, INTERVIEW_QUARTERS)
  const contacts = scoped.filter(isStakePresidentContact)
  const interviews: UnitInterviewStatus[] = scopedUnits
    .map((u) => {
      const own = contacts.filter((s) => s.unitId === u.id)
      const past = own.filter((s) => s.date <= today).map((s) => s.date)
      return {
        unitId: u.id,
        unitName: u.name.ko,
        regionId: u.regionId,
        regionName: regionName.get(u.regionId) ?? u.regionId,
        quarters: quarters.map<InterviewQuarter>((q, i) => {
          const inQuarter = own.filter((s) => s.date >= q.start && s.date <= q.end)
          return {
            ...q,
            isCurrent: i === quarters.length - 1,
            contact: inQuarter.some((s) => s.date <= today)
              ? 'done'
              : inQuarter.length > 0
                ? 'scheduled'
                : 'none',
          }
        }),
        lastContactDate: past.length ? past.reduce((a, b) => (a > b ? a : b)) : null,
      }
    })
    // 이번 분기에 아직 안 한 곳이 위로: 없음 → 예정 → 했음. 같은 상태 안에서는 원래 순서.
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const rank = (r: UnitInterviewStatus) =>
        ({ none: 0, scheduled: 1, done: 2 })[r.quarters[r.quarters.length - 1].contact]
      return rank(a.row) - rank(b.row) || a.index - b.index
    })
    .map(({ row }) => row)

  return {
    summary: {
      visits: units.reduce((sum, u) => sum + u.visits, 0),
      wardsTotal: allWards.length,
      wardsVisited: allWards.filter((w) => w.visits > 0).length,
      wardsNeverVisited: allWards.filter((w) => w.lastVisitDate === null).length,
      interviewUnitsTotal: interviews.length,
      interviewUnitsDone: interviews.filter((r) => r.quarters[r.quarters.length - 1].contact === 'done').length,
    },
    regions,
    units,
    priority,
    interviews,
  }
}

/** 범위(%) — 전체 와드 중 방문한 와드. 와드가 없으면 0. */
export function coveragePercent(visited: number, total: number): number {
  return total > 0 ? Math.round((visited / total) * 100) : 0
}
