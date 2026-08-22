import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import type { ScheduleType } from '@/types'
import type { Leader } from '@/types/leader'
import type { AppUser } from '@/types/user'
import type { UpcomingVisit } from '@/hooks/useUpcomingVisits'
import { getWardsByUnit } from '@/constants/regions'
import { Select, Input } from '@/components/ui'
import type { ScheduleFormState } from './useScheduleForm'
import type { TargetKindChoice, TargetSelection } from './scheduleTargetRules'
import { questionsFor, resetForKind } from './scheduleTargetRules'

const TARGET_KIND_CHOICES: TargetKindChoice[] = ['stake_president', 'ward_bishop', 'cc_council', 'other']

export interface SelectOption {
  value: string
  label: string
}

export interface TargetSectionProps {
  type: ScheduleType
  state: ScheduleFormState
  onChange: (partial: Partial<ScheduleFormState>) => void
  leaders: Leader[]
  users: AppUser[]
  upcomingVisits: UpcomingVisit[]
  /**
   * 스테이크/지방부 목록 — 담당 칠십인 범위로 이미 걸러진 것을 그대로 받는다(read-only
   * data, Controller ruling 1: `WhenSection`의 `conflictingEvent`, `DetailSection`의
   * `canPickProject`와 같은 자리). 이 조각은 users 목록이 없어 스스로 범위를 계산할 수
   * 없다 — 계산은 모달이 하고, 이 조각은 받은 대로 그린다.
   */
  unitOptions: SelectOption[]
  /** 담당 칠십인 범위 정보가 아직 로딩 중이거나(레코드 미도착) 범위 밖이면 true. */
  unitSelectDisabled?: boolean
  /** 협의 평의회 CC 목록 — 마찬가지로 담당 칠십인 범위로 이미 걸러진 것. */
  ccRegionOptions: SelectOption[]
}

/** 방문을 골랐을 때 채워 넣을 대상 — 방문은 항상 와드 감독이 대상인 셈이다. */
function targetForVisit(visit: UpcomingVisit): TargetSelection {
  return { kind: 'ward_bishop', unitId: visit.unitId, wardName: visit.wardName, ccRegionId: '', freeText: '' }
}

/**
 * 대상 조각 — 이 계획이 없애려는 역방향 의존을 담당한다.
 * 대상 유형(target.kind)이 그 아래 어떤 칸을 보여줄지 정하고(questionsFor), 유형을
 * 바꾸면 그 유형이 묻지 않는 값만 지운다(resetForKind). 위쪽 칸(목적·관련 방문)은
 * 원래 종류(type)에만 의존해 아래에서 유형을 바꿔도 바뀌지 않는 게 이 계획의 기본
 * 방향이었다 — 단 하나의 예외가 협의 평의회다: CC 전체가 대상이라 특정 방문에 딸린
 * 사전 모임이라는 개념 자체가 성립하지 않으므로, 대상 유형을 cc_council로 고르면 그
 * 두 칸을 숨기고 값도 지운다(Controller ruling R3, 2026-08-22 — 예전 모달의 동작을
 * 복원한 것으로, 이 계획이 없애려던 역방향 의존이 아니라 의미상 필요한 예외다).
 */
export function TargetSection({
  type,
  state,
  onChange,
  upcomingVisits,
  unitOptions,
  unitSelectDisabled,
  ccRegionOptions,
}: TargetSectionProps) {
  const { t } = useTranslation()
  const { target, purpose, relatedVisitId } = state

  const wardOptions = target.unitId
    ? getWardsByUnit(target.unitId).map((w) => ({ value: w.name.ko, label: w.name.ko }))
    : []

  const changeTarget = (next: Partial<TargetSelection>) => {
    onChange({ target: { ...target, ...next } })
  }

  // ward_visit은 대상이라는 개념이 없다 — 방문하는 곳 자체가 대상이므로 스테이크·와드를
  // 곧바로 묻는다(대상 유형 선택 없음).
  if (type === 'ward_visit') {
    return (
      <>
        <Select
          label={t('schedule.stakeLabel')}
          value={target.unitId}
          onChange={(e) => changeTarget({ unitId: e.target.value, wardName: '' })}
          options={unitOptions}
          disabled={unitSelectDisabled}
        />
        <Select
          label={t('schedule.wardLabel')}
          value={target.wardName}
          onChange={(e) => changeTarget({ wardName: e.target.value })}
          options={wardOptions}
          disabled={!target.unitId}
        />
      </>
    )
  }

  const questions = questionsFor(target.kind)
  const isCcCouncil = target.kind === 'cc_council'
  // 협의 평의회는 모임에만 있는 개념이다(접견 하나에 CC 전체가 대상일 수 없다).
  // 스테이크/지방부 회장 대상은 반대로 접견에만 있다 — CF가 지금까지 한 번도 받아본 적
  // 없는 `type: 'meeting'` + `targetKind: 'stake_president'` 조합을 새로 열지 않는다.
  const kindOptions = TARGET_KIND_CHOICES
    .filter((kind) => kind !== 'cc_council' || type === 'meeting')
    .filter((kind) => kind !== 'stake_president' || type === 'interview')
    .map((kind) => ({ value: kind, label: t(`schedule.targetKind.${kind}`) }))

  return (
    <>
      {/* 협의 평의회는 CC 전체가 대상이라 특정 방문에 딸린 개념(목적·관련 방문)이 성립하지
          않는다 — 대상을 협의 평의회로 고르면 이 두 칸을 아예 숨기고, 이미 골라둔 값도
          지운다(대상 유형 select의 onChange 참고). */}
      {!isCcCouncil && (
        <Select
          label={t('schedule.purposeLabel')}
          value={purpose === 'general' ? '' : purpose}
          placeholder={t('schedule.purposeGeneral')}
          onChange={(e) => {
            const next = (e.target.value || 'general') as 'general' | 'pre_visit'
            onChange(next === 'general' ? { purpose: next, relatedVisitId: '' } : { purpose: next })
          }}
          options={[{ value: 'pre_visit', label: t('schedule.purposePreVisit') }]}
        />
      )}

      {!isCcCouncil && purpose === 'pre_visit' && (
        <Select
          label={t('schedule.relatedVisitLabel')}
          value={relatedVisitId}
          placeholder={
            upcomingVisits.length === 0
              ? t('schedule.relatedVisitNone')
              : t('schedule.relatedVisitPlaceholder')
          }
          onChange={(e) => {
            const id = e.target.value
            const visit = upcomingVisits.find((v) => v.id === id)
            onChange({
              relatedVisitId: id,
              ...(visit ? { target: targetForVisit(visit) } : {}),
            })
          }}
          options={upcomingVisits.map((v) => ({
            value: v.id,
            label: t('schedule.relatedVisitOption', {
              date: dayjs(v.date).format('M/D(ddd)'),
              ward: v.wardName,
            }),
          }))}
          disabled={upcomingVisits.length === 0}
        />
      )}

      <Select
        label={t('schedule.targetKindLabel')}
        value={target.kind}
        onChange={(e) => {
          const nextKind = e.target.value as TargetKindChoice | ''
          onChange({
            target: resetForKind(target, nextKind),
            // 협의 평의회로 바꾸면 목적·관련 방문도 함께 지운다 — 그 두 칸을 숨기고 나서
            // 남은 값이 payload로 새어 나가면 안 된다(예전 targetSelect onChange와 동일).
            ...(nextKind === 'cc_council' ? { purpose: 'general' as const, relatedVisitId: '' } : {}),
          })
        }}
        options={kindOptions}
      />

      {questions.asksUnit && (
        <Select
          label={t('schedule.stakeLabel')}
          value={target.unitId}
          onChange={(e) => changeTarget({ unitId: e.target.value, wardName: '' })}
          options={unitOptions}
          disabled={unitSelectDisabled}
        />
      )}

      {questions.asksWard && (
        <Select
          label={t('schedule.wardLabel')}
          value={target.wardName}
          onChange={(e) => changeTarget({ wardName: e.target.value })}
          options={wardOptions}
          disabled={!target.unitId}
        />
      )}

      {questions.asksCc && (
        <Select
          label={t('schedule.ccRegionLabel')}
          value={target.ccRegionId}
          onChange={(e) => changeTarget({ ccRegionId: e.target.value })}
          options={ccRegionOptions}
        />
      )}

      {questions.asksFreeText && (
        <Input
          label={t('schedule.targetFreeTextLabel')}
          value={target.freeText}
          onChange={(e) => changeTarget({ freeText: e.target.value })}
          placeholder={t('schedule.targetFreeTextPlaceholder')}
        />
      )}
    </>
  )
}
