import { callPublicFunction } from './publicScheduleFetch'
import type { PublicScheduleHistoryPage, PublicSchedulePageData } from '@/types/publicSchedule'

export type {
  PublicGeneralScheduleItem,
  PublicScheduleHistoryPage,
  PublicScheduleItem,
  PublicSchedulePageData,
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
