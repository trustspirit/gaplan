import { describe, it, expect } from 'vitest'
import type { Schedule } from '@/types'
import { ALL_UNITS, WARDS, getRegionIdByUnit } from '@/constants/regions'
import {
  computeVisitStats as compute,
  periodStart as pStart,
  severityOf as sev,
} from './visitStats'

const ward = WARDS[0]
const unitId = ward.unitId
const regionId = getRegionIdByUnit(unitId)!

function mk(partial: Partial<Schedule>): Schedule {
  return {
    id: Math.random().toString(36).slice(2),
    type: 'ward_visit',
    seventyUid: 's1',
    unitId,
    presidentUid: 'p1',
    date: '2026-05-01',
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdBy: 'admin',
    ...partial,
  }
}

const TODAY = '2026-06-10'

describe('periodStart', () => {
  it('computes 3-month lookback', () => {
    expect(pStart('3m', TODAY)).toBe('2026-03-10')
  })
  it('computes this-year start', () => {
    expect(pStart('thisYear', TODAY)).toBe('2026-01-01')
  })
})

describe('severityOf', () => {
  it('null -> red', () => expect(sev(null)).toBe('red'))
  it('<=60 -> green', () => expect(sev(60)).toBe('green'))
  it('61..120 -> amber', () => expect(sev(90)).toBe('amber'))
  it('>120 -> red', () => expect(sev(121)).toBe('red'))
})

describe('computeVisitStats - counts', () => {
  it('counts ward_visit within period, excludes interview/meeting/cancelled', () => {
    const schedules = [
      mk({ type: 'ward_visit', date: '2026-05-01', wardName: ward.name.ko }),
      mk({ type: 'interview', date: '2026-05-02' }),
      mk({ type: 'meeting', date: '2026-05-03' }),
      mk({ type: 'ward_visit', date: '2026-05-04', status: 'cancelled' }),
      mk({ type: 'ward_visit', date: '2025-01-01', wardName: ward.name.ko }),
    ]
    const stats = compute(schedules, { regionId: 'all', period: '3m' }, null, TODAY)
    const region = stats.byRegion.find(r => r.id === regionId)
    expect(region?.count).toBe(1)
    const unit = stats.byUnit.find(u => u.id === unitId)
    expect(unit?.count).toBe(1)
  })

  it('builds a continuous monthly trend across the period', () => {
    const schedules = [mk({ date: '2026-05-01', wardName: ward.name.ko })]
    const stats = compute(schedules, { regionId: 'all', period: '3m' }, null, TODAY)
    const months = stats.monthlyTrend.map(m => m.month)
    expect(months).toContain('2026-03')
    expect(months).toContain('2026-06')
    expect(stats.monthlyTrend.find(m => m.month === '2026-05')?.count).toBe(1)
    expect(stats.monthlyTrend.find(m => m.month === '2026-04')?.count).toBe(0)
  })
})

describe('computeVisitStats - last visit & staleTopN', () => {
  it('ward mode: never-visited wards have null daysSince and sort first', () => {
    const schedules = [mk({ type: 'ward_visit', date: '2026-06-01', wardName: ward.name.ko })]
    const stats = compute(schedules, { regionId: regionId, period: '3m' }, null, TODAY)
    const visited = stats.lastVisit.find(w => w.id === ward.id)
    expect(visited?.lastVisitDate).toBe('2026-06-01')
    expect(visited?.daysSince).toBe(9)
    const neverVisited = stats.lastVisit.filter(w => w.lastVisitDate === null)
    expect(neverVisited.length).toBeGreaterThan(0)
    expect(stats.staleTopN[0].lastVisitDate).toBeNull()
  })

  it('ward mode ignores interview type for recency', () => {
    const schedules = [mk({ type: 'interview', date: '2026-06-01', wardName: ward.name.ko })]
    const stats = compute(schedules, { regionId: regionId, period: '3m' }, null, TODAY)
    const w = stats.lastVisit.find(x => x.id === ward.id)
    expect(w?.lastVisitDate).toBeNull()
  })

  it('recency uses full history, not the selected period', () => {
    const schedules = [mk({ type: 'ward_visit', date: '2026-01-15', wardName: ward.name.ko })]
    const stats = compute(schedules, { regionId: regionId, period: '3m' }, null, TODAY)
    const w = stats.lastVisit.find(x => x.id === ward.id)
    expect(w?.lastVisitDate).toBe('2026-01-15')
  })
})

describe('computeVisitStats - region scope', () => {
  it('seventy scope excludes regions outside allowedRegionIds', () => {
    const otherUnit = ALL_UNITS.find(u => u.regionId !== regionId)!
    const schedules = [
      mk({ unitId, date: '2026-05-01', wardName: ward.name.ko }),
      mk({ unitId: otherUnit.id, date: '2026-05-01' }),
    ]
    const stats = compute(schedules, { regionId: 'all', period: '3m' }, [regionId], TODAY)
    expect(stats.byRegion.every(r => r.id === regionId)).toBe(true)
    expect(stats.byRegion.find(r => r.id === regionId)?.count).toBe(1)
  })

  it('includes schedules directly assigned to the scoped seventy even when the unit is outside allowed regions', () => {
    const otherUnit = ALL_UNITS.find(u => u.regionId !== regionId)!
    const otherRegionId = getRegionIdByUnit(otherUnit.id)!
    const schedules = [
      mk({ unitId: otherUnit.id, seventyUid: 's1', date: '2026-05-01' }),
    ]

    const stats = compute(
      schedules,
      { regionId: 'all', period: '3m' },
      [regionId],
      TODAY,
      { actingSeventyUid: 's1' },
    )

    expect(stats.byRegion.find(r => r.id === otherRegionId)?.count).toBe(1)
    expect(stats.byUnit.find(u => u.id === otherUnit.id)?.count).toBe(1)
    expect(stats.monthlyTrend.find(m => m.month === '2026-05')?.count).toBe(1)
  })
})

describe('computeVisitStats - unit granularity', () => {
  it('unit mode: interview updates unit recency', () => {
    const schedules = [mk({ type: 'interview', date: '2026-06-05' })]
    const stats = compute(schedules, { regionId: regionId, period: '3m', granularity: 'unit' }, null, TODAY)
    const u = stats.lastVisit.find(x => x.id === unitId)
    expect(u?.lastVisitDate).toBe('2026-06-05')
  })

  it('unit mode: never-visited unit has null daysSince', () => {
    const otherUnit = ALL_UNITS.find(u => u.id !== unitId && getRegionIdByUnit(u.id) === regionId)
    const schedules = [mk({ type: 'ward_visit', date: '2026-06-05', wardName: ward.name.ko })]
    const stats = compute(schedules, { regionId: regionId, period: '3m', granularity: 'unit' }, null, TODAY)
    if (otherUnit) {
      const u = stats.lastVisit.find(x => x.id === otherUnit.id)
      expect(u?.daysSince).toBeNull()
    }
    // the visited unit has a recorded date
    const visited = stats.lastVisit.find(x => x.id === unitId)
    expect(visited?.lastVisitDate).toBe('2026-06-05')
  })

  it('staleTopN in unit mode contains units', () => {
    const stats = compute([], { regionId: 'all', period: '3m', granularity: 'unit' }, null, TODAY)
    const unitIds = new Set(ALL_UNITS.map(u => u.id))
    expect(stats.staleTopN.every(e => unitIds.has(e.id))).toBe(true)
  })
})
