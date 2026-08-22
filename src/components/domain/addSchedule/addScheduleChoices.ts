import type { AppUser } from '@/types'
import { canUseAdminTools } from '@/utils/permissions'

export type AddScheduleChoice = 'ward_visit' | 'interview' | 'meeting' | 'general_schedule'

/**
 * 「추가」버튼 하나가 어떤 종류를 고르게 할지 결정하는 단 하나의 판정처.
 * 진입점(SchedulesPage/AdminHome)이 각자 판정하면 반드시 어긋난다 — 라벨을
 * 두 모달이 따로 정하다 드리프트가 났던 것과 같은 종류의 버그다.
 *
 * 일정 3종(ward_visit/interview/meeting)은 canUseAdminTools(admin|exec_secretary)만
 * 만들 수 있다. 행사(general_schedule)는 canUseAdminTools 또는 seventy가 만들 수
 * 있다 — 두 축의 권한이 겹치지 않는 비대칭을 그대로 반영한다.
 *
 * 표시 순서까지 이 배열의 순서가 결정한다.
 */
export function addScheduleChoicesFor(user: AppUser | null): AddScheduleChoice[] {
  if (canUseAdminTools(user)) return ['ward_visit', 'interview', 'meeting', 'general_schedule']
  if (user?.role === 'seventy') return ['general_schedule']
  return []
}
