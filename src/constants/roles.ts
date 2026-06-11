import type { UserRole } from '@/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  exec_secretary: '집행서기',
  seventy: '지역 칠십인',
  president: '스테이크/지방부 회장',
  pending: '승인 대기',
}
