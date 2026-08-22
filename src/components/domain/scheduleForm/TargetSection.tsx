import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import type { ScheduleType } from '@/types'
import type { UpcomingVisit } from '@/hooks/useUpcomingVisits'
import { getWardIdByName } from '@/constants/regions'
import { Select, Input } from '@/components/ui'
import type { ScheduleFormState } from './useScheduleForm'
import type { TargetKindChoice, TargetSelection } from './scheduleTargetRules'
import { questionsFor, resetForKind } from './scheduleTargetRules'
// .hint는 ScheduleFormModal의 related-visit 안내문과 같은 클래스다 — 위치만 이 조각
// 안으로 옮겼을 뿐 마크업은 그대로다(Controller ruling R7, 2026-08-22).
import styles from '../ScheduleFormModal/ScheduleFormModal.module.scss'

const TARGET_KIND_CHOICES: TargetKindChoice[] = ['stake_president', 'ward_bishop', 'cc_council', 'other']

export interface SelectOption {
  value: string
  label: string
}

export interface TargetSectionProps {
  type: ScheduleType
  state: ScheduleFormState
  onChange: (partial: Partial<ScheduleFormState>) => void
  upcomingVisits: UpcomingVisit[]
  /**
   * 스테이크/지방부 목록 — 담당 칠십인 범위로 이미 걸러진 것을 그대로 받는다(read-only
   * data, Controller ruling 1: `WhenSection`의 `conflictingEvent`, `DetailSection`의
   * `canPickProject`와 같은 자리). 대상 유형이 stake_president일 때는 모달이 그 자리에
   * 리더 역할이 붙은 라벨(Controller ruling R9)을 이미 실어 보낸다 — 이 조각은 받은 대로
   * 그릴 뿐, 누가 라벨을 붙였는지는 모른다.
   */
  unitOptions: SelectOption[]
  /** 담당 칠십인 범위 정보가 아직 로딩 중이거나(레코드 미도착) 범위 밖이면 true. */
  unitSelectDisabled?: boolean
  /**
   * 와드/지부 목록 — 이미 target.unitId로 좁혀진 것을 그대로 받는다. ward_bishop 대상
   * select일 때는 모달이 리더 역할 라벨(Controller ruling R9)을 실어 보낸다.
   */
  wardOptions: SelectOption[]
  /** 협의 평의회 CC 목록 — 마찬가지로 담당 칠십인 범위로 이미 걸러진 것. */
  ccRegionOptions: SelectOption[]
  /**
   * 편집 모달 전용 — 대상 유형을 이 값으로 고정하고, 유형 선택 select와 목적/관련 방문
   * 칸을 아예 숨긴다(Controller ruling 1, 2026-08-22: 편집은 대상의 '종류'를 바꿀 수
   * 없다 — 바꿀 수 없는 select를 보여주는 건 아예 안 보여주는 것보다 나쁘다).
   *
   * 편집 모달은 이 값으로 실제 schedule.targetKind를 넘기지 않는다. 예전 편집 모달은
   * ward_bishop/기타 대상이어도 와드·자유입력 칸을 편집하게 해준 적이 없다(오직 스테이크
   * 하나였다) — 그런데도 실제 targetKind를 그대로 넘기면 asksWard/asksFreeText가 켜져
   * 저장되지 않는(payload가 못 담는) 칸이 새로 생긴다. 그래서 편집은 늘 'stake_president'
   * (asksUnit만 켜지는 유일한 값)를 넘겨 "스테이크만 묻는다"는 예전 동작을 재현한다.
   * 협의 평의회는 대상 자체를 바꿀 수단이 없으므로(CF도 regionId 변경을 받지 않는다)
   * 이 조각에 아예 넘기지 않고, 호출부가 읽기 전용 표시를 직접 그린다.
   */
  fixedKind?: TargetKindChoice
  /**
   * 스테이크 select 라벨의 번역 키를 덮어쓴다. 예전 편집 모달은 모임(meeting) 유형일
   * 때만 "선택" 문구가 붙은 라벨을 썼다(schedule.stakeLabelOptional) — 그 문구 차이를
   * 그대로 옮기기 위한 자리다. 넘기지 않으면 기존처럼 schedule.stakeLabel을 쓴다.
   */
  stakeLabelKey?: string
}

/** 방문을 골랐을 때 채워 넣을 대상 — 방문은 항상 와드 감독이 대상인 셈이다.
 * visit.wardId를 먼저 쓰고, 없으면 이름으로 찾는다(예전 폼과 같은 우선순위,
 * ab3ad67:ScheduleFormModal.tsx:480-489: `v.wardId ?? getWardIdByName(v.wardName)`).
 * 어느 쪽으로도 와드 id가 안 풀리면(이름 테이블에 없는 와드 등) 대상을 채우지 않는다 —
 * 예전 폼도 그때는 targetSelect를 비워둔 채로 두어(=대상 미지정) 저장을 막았다
 * (Controller ruling R10, 2026-08-22).
 */
function targetForVisit(visit: UpcomingVisit): TargetSelection | null {
  const wardId = visit.wardId ?? getWardIdByName(visit.wardName)
  if (!wardId) return null
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
  wardOptions,
  ccRegionOptions,
  fixedKind,
  stakeLabelKey,
}: TargetSectionProps) {
  const { t } = useTranslation()
  const { target, purpose, relatedVisitId } = state
  const relatedVisit = upcomingVisits.find((v) => v.id === relatedVisitId)

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

  const effectiveKind = fixedKind ?? target.kind
  const questions = questionsFor(effectiveKind)
  const isCcCouncil = effectiveKind === 'cc_council'
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
          지운다(대상 유형 select의 onChange 참고). 대상 유형이 고정된 편집 모달에는 애초에
          '목적'이라는 개념 자체가 없으므로 이 블록 전체를 숨긴다. */}
      {!fixedKind && !isCcCouncil && (
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

      {!fixedKind && !isCcCouncil && purpose === 'pre_visit' && (
        <>
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
              const nextTarget = visit ? targetForVisit(visit) : null
              onChange({
                relatedVisitId: id,
                ...(nextTarget ? { target: nextTarget } : {}),
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
          {/* 예전 위치 그대로 — 관련 방문 select 바로 아래, 대상 유형 select보다 위
              (Controller ruling R7, 2026-08-22). */}
          {relatedVisit && (
            <p className={styles.hint}>
              {t('schedule.relatedVisitRecommendedBy', {
                date: dayjs(relatedVisit.date).subtract(14, 'day').format('M/D'),
              })}
            </p>
          )}
        </>
      )}

      {!fixedKind && (
        <Select
          label={t('schedule.targetKindLabel')}
          value={target.kind}
          onChange={(e) => {
            const nextKind = e.target.value as TargetKindChoice | ''
            const resetTarget = resetForKind(target, nextKind)
            // 담당 CC가 하나뿐이면 굳이 고르게 하지 않는다 — 예전 모달의 자동 선택
            // (Controller ruling R6, 2026-08-22).
            const nextTarget =
              nextKind === 'cc_council' && ccRegionOptions.length === 1
                ? { ...resetTarget, ccRegionId: ccRegionOptions[0].value }
                : resetTarget
            onChange({
              target: nextTarget,
              // 협의 평의회로 바꾸면 목적·관련 방문도 함께 지운다 — 그 두 칸을 숨기고 나서
              // 남은 값이 payload로 새어 나가면 안 된다(예전 targetSelect onChange와 동일).
              ...(nextKind === 'cc_council' ? { purpose: 'general' as const, relatedVisitId: '' } : {}),
            })
          }}
          options={kindOptions}
        />
      )}

      {questions.asksUnit && (
        <Select
          label={t(stakeLabelKey ?? 'schedule.stakeLabel')}
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
          disabled={ccRegionOptions.length === 0}
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
