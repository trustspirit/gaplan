import type { AppUser } from '@/types'

/** admin 전용 슈퍼 권한 (유저 관리, 전역 설정). */
export function isSuperAdmin(user: AppUser | null): boolean {
  return user?.role === 'admin'
}

/**
 * 칠십인 전용 행사를 볼 수 있는가. firestore.rules의 generalSchedules read와 같은 기준이다 —
 * 여기서 true인데 규칙이 막으면 행사 조회 전체가 거부된다.
 */
export function canSeeSeventyOnlyEvents(user: AppUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'seventy' || user?.role === 'exec_secretary'
}

/**
 * 행사에 담당 지역 칠십인의 참석 여부를 표시할 수 있는가. 행사를 만든 사람이 아니어도 된다 —
 * firestore.rules가 이 세 역할에게 seventyAttends 한 필드의 수정을 허용한다.
 */
export function canMarkSeventyAttendance(user: Pick<AppUser, 'role'> | null): boolean {
  return user?.role === 'admin' || user?.role === 'seventy' || user?.role === 'exec_secretary'
}

/** admin 도구 전반 접근 (일정·task 생성/수정, 방문계획, 프로젝트, 통계). */
export function canUseAdminTools(user: AppUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'exec_secretary'
}
