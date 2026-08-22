import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import type { ScheduleType } from '@/types'
import type { Leader } from '@/types/leader'
import type { AppUser } from '@/types/user'
import type { UpcomingVisit } from '@/hooks/useUpcomingVisits'
import { ALL_UNITS, REGIONS, getWardsByUnit } from '@/constants/regions'
import { Select, Input } from '@/components/ui'
import type { ScheduleFormState } from './useScheduleForm'
import type { TargetKindChoice, TargetSelection } from './scheduleTargetRules'
import { questionsFor, resetForKind } from './scheduleTargetRules'

const TARGET_KIND_CHOICES: TargetKindChoice[] = ['stake_president', 'ward_bishop', 'cc_council', 'other']

export interface TargetSectionProps {
  type: ScheduleType
  state: ScheduleFormState
  onChange: (partial: Partial<ScheduleFormState>) => void
  leaders: Leader[]
  users: AppUser[]
  upcomingVisits: UpcomingVisit[]
}

/** 방문을 골랐을 때 채워 넣을 대상 — 방문은 항상 와드 감독이 대상인 셈이다. */
function targetForVisit(visit: UpcomingVisit): TargetSelection {
  return { kind: 'ward_bishop', unitId: visit.unitId, wardName: visit.wardName, ccRegionId: '', freeText: '' }
}

/**
 * 대상 조각 — 이 계획이 없애려는 역방향 의존을 담당한다.
 * 대상 유형(target.kind)이 그 아래 어떤 칸을 보여줄지 정하고(questionsFor), 유형을
 * 바꾸면 그 유형이 묻지 않는 값만 지운다(resetForKind). 위쪽 칸(목적·관련 방문)은
 * 유형이 아니라 종류(type)에만 의존하므로, 아래에서 유형을 바꿔도 절대 바뀌지 않는다.
 */
export function TargetSection({ type, state, onChange, upcomingVisits }: TargetSectionProps) {
  const { t } = useTranslation()
  const { target, purpose, relatedVisitId } = state

  const unitOptions = ALL_UNITS.map((u) => ({ value: u.id, label: u.name.ko }))
  const wardOptions = target.unitId
    ? getWardsByUnit(target.unitId).map((w) => ({ value: w.name.ko, label: w.name.ko }))
    : []
  const ccRegionOptions = REGIONS.map((r) => ({ value: r.id, label: r.name }))

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
  // 협의 평의회는 모임에만 있는 개념이다(접견 하나에 CC 전체가 대상일 수 없다).
  const kindOptions = TARGET_KIND_CHOICES
    .filter((kind) => kind !== 'cc_council' || type === 'meeting')
    .map((kind) => ({ value: kind, label: t(`schedule.targetKind.${kind}`) }))

  return (
    <>
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

      {purpose === 'pre_visit' && (
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
        onChange={(e) => onChange({ target: resetForKind(target, e.target.value as TargetKindChoice | '') })}
        options={kindOptions}
      />

      {questions.asksUnit && (
        <Select
          label={t('schedule.stakeLabel')}
          value={target.unitId}
          onChange={(e) => changeTarget({ unitId: e.target.value, wardName: '' })}
          options={unitOptions}
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
