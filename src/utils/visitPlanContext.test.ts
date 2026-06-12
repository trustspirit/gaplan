import { describe, it, expect } from 'vitest'
import type { GeneralSchedule, Schedule } from '@/types'
import { ALL_UNITS, getRegionIdByUnit } from '@/constants/regions'
import {
  isGeneralScheduleRelevantToUnit,
  findNearbyEvents,
  computeUnitBalance,
  CONFERENCE_PROXIMITY_DAYS,
} from './visitPlanContext'

const unit = ALL_UNITS[0]
const regionId = getRegionIdByUnit(unit.id)!

function gs(partial: Partial<GeneralSchedule>): GeneralSchedule {
  return {
    id: Math.random().toString(36).slice(2),
    title: '대회',
    date: '2026-06-20',
    category: 'conference',
    createdBy: 'admin',
    createdAt: '2026-06-01',
    isPublic: false,
    ...partial,
  }
}

function sched(partial: Partial<Schedule>): Schedule {
  return {
    id: Math.random().toString(36).slice(2),
    type: 'ward_visit',
    seventyUid: 's1',
    unitId: unit.id,
    presidentUid: 'p1',
    date: '2026-05-01',
    startTime: '10:00',
    endTime: '13:00',
    status: 'confirmed',
    createdBy: 'admin',
    ...partial,
  }
}

describe('isGeneralScheduleRelevantToUnit', () => {
  it('org-wide event is relevant to any unit', () => {
    expect(isGeneralScheduleRelevantToUnit(gs({}), unit.id)).toBe(true)
  })
  it('region-targeted event is relevant to units in that region', () => {
    expect(isGeneralScheduleRelevantToUnit(gs({ targetRegionIds: [regionId] }), unit.id)).toBe(true)
  })
  it('other-region-targeted event is not relevant', () => {
    expect(isGeneralScheduleRelevantToUnit(gs({ targetRegionIds: ['__nope__'] }), unit.id)).toBe(false)
  })
  it('unit-targeted event matches that unit', () => {
    expect(isGeneralScheduleRelevantToUnit(gs({ targetUnitIds: [unit.id] }), unit.id)).toBe(true)
  })
})

describe('findNearbyEvents', () => {
  it('flags an event within ±14 days', () => {
    const events = [gs({ date: '2026-06-20' })]
    expect(findNearbyEvents('2026-06-14', unit.id, events)).toHaveLength(1)
  })
  it('ignores an event outside the window', () => {
    const events = [gs({ date: '2026-06-20' })]
    expect(findNearbyEvents('2026-05-01', unit.id, events)).toHaveLength(0)
  })
  it('ignores an event not relevant to the unit', () => {
    const events = [gs({ date: '2026-06-20', targetRegionIds: ['__nope__'] })]
    expect(findNearbyEvents('2026-06-14', unit.id, events)).toHaveLength(0)
  })
  it('uses the default proximity window constant', () => {
    expect(CONFERENCE_PROXIMITY_DAYS).toBe(14)
  })
})

describe('computeUnitBalance', () => {
  it('counts actual confirmed ward visits in window plus planned items', () => {
    const units = [{ id: unit.id, name: unit.name.ko }]
    const schedules = [
      sched({ date: '2026-05-01' }),                       // 집계됨
      sched({ date: '2026-05-02', status: 'cancelled' }),  // 제외 (status)
      sched({ date: '2026-05-03', type: 'interview' }),    // 제외 (type)
      sched({ date: '2025-01-01' }),                       // 제외 (윈도우 밖)
    ]
    const planItems = [{ unitId: unit.id }, { unitId: unit.id }]
    const [entry] = computeUnitBalance(units, schedules, planItems, '2026-03-01', '2026-06-10')
    expect(entry.actualCount).toBe(1)
    expect(entry.plannedCount).toBe(2)
    expect(entry.total).toBe(3)
  })
})
