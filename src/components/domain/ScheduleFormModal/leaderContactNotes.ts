import { ALL_UNITS } from '@/constants/regions'
import type { ScheduleType } from '@/types'
import type { Leader } from '@/types/leader'

const STAKE_LEVEL_ROLES = ['스테이크 회장', '지방부 회장']
const WARD_LEVEL_ROLES = ['감독', '지부 회장']

function getLeaderForUnitName(unitNameKo: string, leaders: Leader[], roles: string[]): Leader | undefined {
  return leaders.find(l => l.unitNameKo === unitNameKo && roles.includes(l.role))
    ?? leaders.find(l => l.unitNameKo === unitNameKo)
}

function optionLabel(unitNameKo: string, leader?: Leader): string {
  return leader ? `${unitNameKo} · ${leader.role}` : unitNameKo
}

/**
 * "서울 스테이크 · 스테이크 회장" 형태의 라벨 — 스테이크/지방부 회장 대상을 고르는
 * select의 각 옵션에 쓴다(Controller ruling R9, 2026-08-22). 예전에는 이 조회
 * (getLeaderForUnitName)를 getContactTargetOptions와 함께 썼지만, 그 함수는 프로덕션
 * 코드 어디서도 호출되지 않아 M5(2026-08-22)에서 지웠다 — 이 함수만 남아 같은 조회를
 * 계속 재사용한다.
 */
export function stakeTargetLabel(unitNameKo: string, leaders: Leader[]): string {
  return optionLabel(unitNameKo, getLeaderForUnitName(unitNameKo, leaders, STAKE_LEVEL_ROLES))
}

/**
 * "녹번 와드 · 감독" 형태의 라벨 — 와드/지부 감독 대상을 고르는 select의 각 옵션에 쓴다
 * (Controller ruling R9). 대상을 고르면 그 리더의 연락처가 노트에 붙는다는 게 이 select의
 * 요점이므로, 저장 전에 누구인지 보여준다.
 */
export function wardTargetLabel(unitNameKo: string, leaders: Leader[]): string {
  return optionLabel(unitNameKo, getLeaderForUnitName(unitNameKo, leaders, WARD_LEVEL_ROLES))
}

export function buildNotesWithLeaderContact(params: {
  type: ScheduleType
  unitId: string
  contactTargetUnitName: string
  notes: string
  leaders: Leader[]
}): string {
  const { unitId, contactTargetUnitName, notes, leaders } = params
  const fallbackUnitName = ALL_UNITS.find(u => u.id === unitId)?.name.ko ?? ''
  const targetUnitName = contactTargetUnitName || fallbackUnitName
  if (!targetUnitName) return notes

  const leader = getLeaderForUnitName(
    targetUnitName,
    leaders,
    targetUnitName === fallbackUnitName ? STAKE_LEVEL_ROLES : WARD_LEVEL_ROLES,
  )
  if (!leader) return notes

  const leaderInfo = `${leader.role}: ${leader.name} (${leader.phone ?? '번호 없음'})`
  return notes.trim() ? `${leaderInfo}\n${notes}` : leaderInfo
}
