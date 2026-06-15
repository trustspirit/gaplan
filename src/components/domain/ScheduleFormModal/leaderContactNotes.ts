import { ALL_UNITS, getWardsByUnit } from '@/constants/regions'
import type { ScheduleType } from '@/types'
import type { Leader } from '@/types/leader'
import type { AppUser } from '@/types/user'

export interface ContactTargetOption {
  value: string
  label: string
  unitNameKo: string
  presidentUid?: string
}

const STAKE_LEVEL_ROLES = ['스테이크 회장', '지방부 회장']
const WARD_LEVEL_ROLES = ['감독', '지부 회장']

function getLeaderForUnitName(unitNameKo: string, leaders: Leader[], roles: string[]): Leader | undefined {
  return leaders.find(l => l.unitNameKo === unitNameKo && roles.includes(l.role))
    ?? leaders.find(l => l.unitNameKo === unitNameKo)
}

function optionLabel(unitNameKo: string, leader?: Leader): string {
  return leader ? `${unitNameKo} · ${leader.role}` : unitNameKo
}

export function getContactTargetOptions(params: {
  type: ScheduleType
  unitId: string
  leaders: Leader[]
  users: AppUser[]
}): ContactTargetOption[] {
  const { type, unitId, leaders, users } = params
  if (!unitId || (type !== 'interview' && type !== 'meeting')) return []

  const options: ContactTargetOption[] = []
  const unit = ALL_UNITS.find(u => u.id === unitId)

  if (type === 'interview' && unit) {
    const leader = getLeaderForUnitName(unit.name.ko, leaders, STAKE_LEVEL_ROLES)
    const president = users.find(u => u.role === 'president' && u.unitId === unitId)
    options.push({
      value: `unit:${unit.id}`,
      label: optionLabel(unit.name.ko, leader),
      unitNameKo: unit.name.ko,
      ...(president ? { presidentUid: president.uid } : {}),
    })
  }

  for (const ward of getWardsByUnit(unitId)) {
    const leader = getLeaderForUnitName(ward.name.ko, leaders, WARD_LEVEL_ROLES)
    options.push({
      value: `ward:${ward.id}`,
      label: optionLabel(ward.name.ko, leader),
      unitNameKo: ward.name.ko,
    })
  }

  return options
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
