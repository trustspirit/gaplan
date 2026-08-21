import { ALL_UNITS } from '@/constants/regions'
import { ROLE_LABELS, MANAGEABLE_ROLES, PRE_REG_ROLES, SECONDARY_ROLES } from '@/constants/roles'
import type { SecondaryRole } from '@/types'

export type SecondaryRoleOrNull = SecondaryRole | null

// 라벨(ROLE_LABELS)은 아직 i18n으로 옮겨지지 않은 기존 상수라 이 분리 작업 범위
// 밖이다 — 그대로 옮긴다.
export const ROLE_OPTIONS = MANAGEABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))
export const PRE_ROLE_OPTIONS = PRE_REG_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))
export const UNIT_OPTIONS = ALL_UNITS.map((u) => ({ value: u.id, label: u.name.ko }))

/**
 * 하드코딩된 '없음'을 `common.none` 키로 바꿨다 — 그 키는 이미 ko/en 양쪽에 있다.
 * 번역이 필요해 top-level 상수가 아니라 t를 받는 함수가 됐다.
 */
export function getSecondaryRoleOptions(
  t: (key: string) => string,
): { value: string; label: string }[] {
  return [
    { value: '', label: t('common.none') },
    ...SECONDARY_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
  ]
}
