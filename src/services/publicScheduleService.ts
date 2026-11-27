import { callPublicFunction } from './publicScheduleFetch'
import type {
  PublicScheduleHistoryPage,
  PublicSchedulePageData,
  PublicWardVisitItem,
} from '@/types/publicSchedule'

export type {
  PublicGeneralScheduleItem,
  PublicScheduleHistoryPage,
  PublicScheduleItem,
  PublicSchedulePageData,
  PublicWardVisitItem,
} from '@/types/publicSchedule'

export async function fetchPublicSchedulePageData(token: string): Promise<PublicSchedulePageData> {
  const result = await callPublicFunction<
    { token: string },
    Partial<PublicSchedulePageData> & Pick<PublicSchedulePageData, 'schedules'>
  >('getPublicSchedules', { token })
  return {
    schedules: result.schedules,
    generalSchedules: result.generalSchedules ?? [],
    scopeDisplayName: result.scopeDisplayName ?? null,
    ...(typeof result.historyBefore === 'string' ? { historyBefore: result.historyBefore } : {}),
    ...(result.wardVisitsAvailable === true ? { wardVisitsAvailable: true } : {}),
  }
}

/** before(제외)보다 이른 공개 일정을 최신순으로 한 쪽(약 10개) 받는다. */
export async function fetchPublicScheduleHistory(
  token: string,
  before: string,
): Promise<PublicScheduleHistoryPage> {
  const result = await callPublicFunction<
    { token: string; before: string },
    Partial<PublicScheduleHistoryPage>
  >('getPublicScheduleHistory', { token, before })
  return {
    schedules: result.schedules ?? [],
    generalSchedules: result.generalSchedules ?? [],
    nextBefore: typeof result.nextBefore === 'string' ? result.nextBefore : null,
  }
}

/** 칠십인 개인 링크의 한 해 치 와드 방문. */
export async function fetchPublicWardVisits(token: string, year: number): Promise<PublicWardVisitItem[]> {
  const result = await callPublicFunction<{ token: string; year: number }, { visits?: PublicWardVisitItem[] }>(
    'getPublicWardVisits',
    { token, year },
  )
  return Array.isArray(result.visits) ? result.visits : []
}
