// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  loadScheduleCache,
  saveScheduleCache,
  clearScheduleCache,
  type ScheduleCacheData,
} from './scheduleCache'

const SAMPLE: ScheduleCacheData = {
  schedules: [
    {
      id: 's1', type: 'ward_visit', unitId: 'u1',
      date: '2026-07-01', startTime: '10:00', endTime: '12:00', status: 'confirmed',
    },
  ],
  generalSchedules: [],
  scopeDisplayName: null,
}

const TOKEN = 'test-token-abc'

beforeEach(() => {
  sessionStorage.clear()
})

describe('loadScheduleCache', () => {
  it('캐시가 없으면 null 반환', () => {
    expect(loadScheduleCache(TOKEN)).toBeNull()
  })

  it('저장된 캐시를 반환', () => {
    saveScheduleCache(TOKEN, SAMPLE)
    const result = loadScheduleCache(TOKEN)
    expect(result).toEqual(SAMPLE)
  })

  it('TTL 만료 시 null 반환 후 항목 삭제', () => {
    saveScheduleCache(TOKEN, SAMPLE)
    const key = `schedule-cache:${TOKEN}`
    const entry = JSON.parse(sessionStorage.getItem(key)!)
    entry.cachedAt = Date.now() - 6 * 60 * 1000
    sessionStorage.setItem(key, JSON.stringify(entry))

    expect(loadScheduleCache(TOKEN)).toBeNull()
    expect(sessionStorage.getItem(key)).toBeNull()
  })

  it('손상된 JSON이 있어도 null 반환 (예외 없음)', () => {
    sessionStorage.setItem(`schedule-cache:${TOKEN}`, 'invalid json')
    expect(() => loadScheduleCache(TOKEN)).not.toThrow()
    expect(loadScheduleCache(TOKEN)).toBeNull()
  })
})

describe('saveScheduleCache', () => {
  it('sessionStorage에 저장 후 loadScheduleCache로 복원 가능', () => {
    saveScheduleCache(TOKEN, SAMPLE)
    expect(loadScheduleCache(TOKEN)).toEqual(SAMPLE)
  })

  it('저장 실패해도 예외 없음 (sessionStorage 사용 불가 상황 시뮬레이션)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveScheduleCache(TOKEN, SAMPLE)).not.toThrow()
  })
})

describe('clearScheduleCache', () => {
  it('항목 삭제', () => {
    saveScheduleCache(TOKEN, SAMPLE)
    clearScheduleCache(TOKEN)
    expect(loadScheduleCache(TOKEN)).toBeNull()
  })

  it('없는 항목 삭제해도 예외 없음', () => {
    expect(() => clearScheduleCache('nonexistent')).not.toThrow()
  })
})
