import { callPublicFunction } from './publicScheduleFetch'
import type { PublicSchedulePageData } from '@/types/publicSchedule'

export type {
  PublicGeneralScheduleItem,
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
  }
}
