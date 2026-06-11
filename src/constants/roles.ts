import type { UserRole, SecondaryRole } from '@/types'

export const ROLE = {
  ADMIN:          'admin',
  EXEC_SECRETARY: 'exec_secretary',
  SEVENTY:        'seventy',
  PRESIDENT:      'president',
  PENDING:        'pending',
} as const satisfies Record<string, UserRole>

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  exec_secretary: '집행서기',
  seventy: '지역 칠십인',
  president: '스테이크/지방부 회장',
  pending: '승인 대기',
}

export const MANAGEABLE_ROLES: readonly UserRole[] = [ROLE.ADMIN, ROLE.EXEC_SECRETARY, ROLE.SEVENTY, ROLE.PRESIDENT]
export const PRE_REG_ROLES: readonly UserRole[] = [ROLE.PRESIDENT, ROLE.SEVENTY, ROLE.EXEC_SECRETARY]
export const SECONDARY_ROLES: readonly SecondaryRole[] = [ROLE.EXEC_SECRETARY, ROLE.SEVENTY, ROLE.PRESIDENT]
