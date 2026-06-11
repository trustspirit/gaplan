import type { AppUser } from '@/types'

/** admin 전용 슈퍼 권한 (유저 관리, 전역 설정). */
export function isSuperAdmin(user: AppUser | null): boolean {
  return user?.role === 'admin'
}

/** admin 도구 전반 접근 (일정·task 생성/수정, 방문계획, 프로젝트, 통계). */
export function canUseAdminTools(user: AppUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'exec_secretary'
}
