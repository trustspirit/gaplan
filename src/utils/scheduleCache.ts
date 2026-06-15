import type { PublicGeneralScheduleItem, PublicScheduleItem } from '@/types/publicSchedule'

export interface ScheduleCacheData {
  schedules: PublicScheduleItem[]
  generalSchedules: PublicGeneralScheduleItem[]
  scopeDisplayName: string | null
}

interface CacheEntry {
  data: ScheduleCacheData
  cachedAt: number
}

const CACHE_TTL = 5 * 60 * 1000

function cacheKey(token: string) {
  return `schedule-cache:${token}`
}

export function loadScheduleCache(token: string): ScheduleCacheData | null {
  const key = cacheKey(token)
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.cachedAt > CACHE_TTL) {
      sessionStorage.removeItem(key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function saveScheduleCache(token: string, data: ScheduleCacheData): void {
  try {
    const entry: CacheEntry = { data, cachedAt: Date.now() }
    sessionStorage.setItem(cacheKey(token), JSON.stringify(entry))
  } catch {
    // sessionStorage 비활성(개인정보 보호 모드 등) 시 무시
  }
}

export function clearScheduleCache(token: string): void {
  try {
    sessionStorage.removeItem(cacheKey(token))
  } catch {
    // 무시
  }
}
