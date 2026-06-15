import type { HttpsCallable } from 'firebase/functions'
import { publicCallable } from './publicFunctions'
import type { PublicSchedulePageData } from '@/types/publicSchedule'

type PublicScheduleCallable = HttpsCallable<
  { token: string },
  Partial<PublicSchedulePageData> & Pick<PublicSchedulePageData, 'schedules'>
>

let getPublicSchedules: PublicScheduleCallable | null = null

function publicScheduleCallable(): PublicScheduleCallable {
  if (!getPublicSchedules) {
    getPublicSchedules = publicCallable<
      { token: string },
      Partial<PublicSchedulePageData> & Pick<PublicSchedulePageData, 'schedules'>
    >('getPublicSchedules')
  }
  return getPublicSchedules
}

export type {
  PublicGeneralScheduleItem,
  PublicScheduleItem,
  PublicSchedulePageData,
} from '@/types/publicSchedule'

export async function fetchPublicSchedulePageData(token: string): Promise<PublicSchedulePageData> {
  const result = await publicScheduleCallable()({ token })
  return {
    schedules: result.data.schedules,
    generalSchedules: result.data.generalSchedules ?? [],
    scopeDisplayName: result.data.scopeDisplayName ?? null,
  }
}
