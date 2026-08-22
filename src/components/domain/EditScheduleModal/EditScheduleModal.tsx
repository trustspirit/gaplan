import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { httpsCallable } from 'firebase/functions'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { functions } from '@/firebase'
import { useUsers } from '@/hooks/useUsers'
import { useUpcomingVisits } from '@/hooks/useUpcomingVisits'
import { ALL_UNITS, REGIONS, getWardsByUnit } from '@/constants/regions'
import type { Schedule } from '@/types'
import { DeleteConfirmSheet, Input, Select } from '@/components/ui'
import { acquireScrollLock, releaseScrollLock } from '@/utils/scrollLock'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { buildScheduleTitle, buildScheduleLocation } from '../../../../functions/src/scheduleRules'
import { useScheduleForm } from '../scheduleForm/useScheduleForm'
import type { ScheduleFormState } from '../scheduleForm/useScheduleForm'
import { TargetSection } from '../scheduleForm/TargetSection'
import { WhenSection } from '../scheduleForm/WhenSection'
import { DetailSection } from '../scheduleForm/DetailSection'
import styles from './EditScheduleModal.module.scss'

const adminEditScheduleFn = httpsCallable(functions, 'adminEditSchedule')

interface Props {
  schedule: Schedule
  onClose: () => void
  onSaved: () => void
  onDelete?: () => void
}

export function EditScheduleModal({ schedule, onClose, onSaved, onDelete }: Props) {
  const { t } = useTranslation()
  const { users } = useUsers()

  // 편집은 대상의 '종류'(targetKind)를 바꿀 수단이 없다(Controller ruling 1, 2026-08-22) —
  // 그래서 useScheduleForm의 target에는 늘 초기값만 채우고, TargetSection에는 아래에서
  // fixedKind를 넘겨 유형 select 자체를 숨긴다. 협의 평의회는 대상을 바꿀 수단이 CF에도
  // 없으므로(regionId는 updates 계약에 없다) TargetSection에 넘기지 않고 읽기 전용
  // 표시를 이 모달이 직접 그린다(아래 참고).
  const { state, set, isDirty: formIsDirty } = useScheduleForm({
    type: schedule.type,
    target: {
      kind: schedule.type === 'ward_visit' ? '' : 'stake_president',
      unitId: schedule.unitId ?? '',
      wardName: schedule.wardName ?? '',
      ccRegionId: '',
      freeText: '',
    },
    date: schedule.date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    notes: schedule.notes ?? '',
    zoomLink: schedule.zoomLink ?? '',
    customTitle: schedule.customTitle ?? '',
    // 편집 CF는 payload에 명시적 location이 없으면 저장된 값을 다시 유도해 버린다(비고정) —
    // 그래서 여기서 반드시 schedule.location으로 프리필해야 사용자가 손으로 쓴 장소가
    // 시간/대상만 바꾸는 편집에도 그대로 살아남는다.
    location: schedule.location ?? '',
    projectId: schedule.projectId ?? '',
    presidentAccompanied: schedule.presidentAccompanied ?? false,
    relatedVisitId: schedule.relatedVisitId ?? '',
  })
  const { target, date, startTime, endTime, notes, zoomLink, customTitle, location, projectId, presidentAccompanied, relatedVisitId } = state

  // TargetSection/WhenSection/DetailSection은 { state, onChange } 계약을 쓴다 — onChange는
  // 부분 병합. useScheduleForm의 set(key, value)를 그 모양으로 감싼다(생성 모달과 동일).
  const applyPartial = (partial: Partial<ScheduleFormState>) => {
    ;(Object.keys(partial) as Array<keyof ScheduleFormState>).forEach((key) => {
      set(key, partial[key] as ScheduleFormState[typeof key])
    })
  }

  const [presidentUid, setPresidentUid] = useState(schedule.presidentUid ?? '')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 협의 평의회는 CC 전체가 대상이라 스테이크가 없다. 스테이크를 붙이면 그 스테이크
  // 쿼리에까지 딸려 나오므로(서버에서도 거부한다) 선택 자체를 노출하지 않는다.
  const isCcCouncil = schedule.targetKind === 'cc_council'
  const ccRegionName = REGIONS.find(r => r.id === schedule.regionId)?.name ?? schedule.regionId ?? ''

  // wardName은 TargetSection의 stake select onChange가 이미 unitId 변경과 한번에 지운다
  // (changeTarget({ unitId, wardName: '' })) — 여기서는 TargetSection이 모르는 presidentUid만
  // 마저 지운다(예전 effect의 두 몫 중 나머지 절반).
  const isFirstUnitChange = useRef(true)
  useEffect(() => {
    if (isFirstUnitChange.current) { isFirstUnitChange.current = false; return }
    setPresidentUid('')
  }, [target.unitId])

  // Guard against losing edits to a stray backdrop tap / Escape
  const isDirty = formIsDirty || presidentUid !== (schedule.presidentUid ?? '')
  const requestClose = () => {
    if (isDirty && !window.confirm(t('common.discardChanges'))) return
    onClose()
  }

  const sheetRef = useRef<HTMLDivElement>(null)
  // pause the trap while the delete confirm sheet is stacked on top
  useFocusTrap(sheetRef, !showDeleteConfirm, requestClose)
  useEffect(() => {
    acquireScrollLock()
    return releaseScrollLock
  }, [])

  const isVisit = schedule.type === 'ward_visit'
  const isInterview = schedule.type === 'interview'
  const isContact = schedule.type === 'interview' || schedule.type === 'meeting'
  const { visits: upcomingVisits, loading: upcomingVisitsLoading } = useUpcomingVisits(
    schedule.seventyUid,
    date || schedule.date,
  )

  // relatedVisitId Select를 사용자가 직접 조작했는지(연결 해제 포함) 추적한다. 아래
  // "날짜가 원래 값으로 돌아오면 복구" 분기는 사용자 의도를 덮어쓰면 안 되므로 한번
  // 직접 건드리면 그 뒤로는 개입하지 않는다. 반면 "목록에 없는 stale id 정리" 분기는
  // 서버로 무효한 id가 넘어가는 걸 막는 안전망이라 touched 여부와 무관하게 항상 돈다 —
  // Select를 건드렸다는 사실이 "그 값이 여전히 유효하다"는 보장이 되지는 않는다.
  const relatedVisitTouchedRef = useRef(false)

  // 날짜를 바꾸면(방문 이후로 옮기는 등) 이미 골라둔 relatedVisitId가 새 조회 결과에서
  // 사라질 수 있다 — 그 stale id를 그대로 서버에 보내면 불투명한 에러가 난다. 이 정리는
  // touched 여부와 무관하게 항상 적용한다.
  //
  // 반대로 이 모달은 생성 모달과 달리 기존 일정에 저장된 relatedVisitId가 초기값으로
  // 들어온다. 날짜를 안 건드렸는데 그 초기값이 목록에 없다고(취소된 방문, 조회
  // 범위 밖, 백필 시점 이슈 등) 사용자 의도 없이 지워버리면 이미 지난 방문에
  // 연결된 과거 모임 편집 같은 정상적인 케이스까지 끊어버리게 된다. 그래서 날짜가
  // 원래 값(schedule.date)과 같은 동안은 자동으로 지우지 않을 뿐 아니라, 날짜를
  // 바꿨다가 다시 원래 값으로 되돌리면(오타 수정 등) 그 사이 자동으로 지워졌던
  // relatedVisitId도 원래 저장값으로 복구한다 — 단, 사용자가 Select를 직접 건드린
  // 적이 없을 때만. 사용자가 직접 골랐다면(연결 해제 포함) 그 선택이 최종 의사이므로
  // 날짜 왕복으로 되살리지 않는다.
  useEffect(() => {
    if (date === schedule.date) {
      if (!relatedVisitTouchedRef.current) {
        set('relatedVisitId', schedule.relatedVisitId ?? '')
      }
      return
    }
    if (!relatedVisitId || upcomingVisitsLoading) return
    if (!upcomingVisits.some(v => v.id === relatedVisitId)) {
      set('relatedVisitId', '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, schedule.date, schedule.relatedVisitId, relatedVisitId, upcomingVisitsLoading, upcomingVisits])

  const deleteDescription = schedule.type === 'ward_visit' && schedule.wardName
    ? `구역 방문 · ${schedule.wardName}`
    : t(`schedule.type.${schedule.type}`)

  const seventy = users.find(u => u.uid === schedule.seventyUid)
  const seventyRegionIds = seventy?.regionIds ?? (seventy?.regionId ? [seventy.regionId] : [])
  const unitPool = seventyRegionIds.length > 0
    ? ALL_UNITS.filter(u => seventyRegionIds.includes(u.regionId ?? ''))
    : ALL_UNITS
  const unitOptions = unitPool.map(u => ({ value: u.id, label: u.name.ko }))
  const wardOptions = target.unitId ? getWardsByUnit(target.unitId).map(w => ({ value: w.name.ko, label: w.name.ko })) : []
  const presidentOptions = users
    .filter(u => u.role === 'president' && u.unitId === target.unitId && !!target.unitId)
    .map(u => ({ value: u.uid, label: u.preRegistered ? u.name : `${u.name} ✓` }))

  // 지금까지 고친 값만으로 저장 시 유도될 제목·장소를 미리 보여준다. 대상(targetKind)은
  // 이 폼에 바꿀 수단이 없으므로 저장된 값을 그대로 쓴다.
  const autoParts = {
    type: schedule.type,
    unitName: ALL_UNITS.find((u) => u.id === target.unitId)?.name.ko,
    wardName: target.wardName || undefined,
    targetKind: schedule.targetKind ?? null,
    ccName: REGIONS.find((r) => r.id === schedule.regionId)?.name,
  }
  const autoTitle = buildScheduleTitle(autoParts)
  const autoLocation = buildScheduleLocation({ ...autoParts, zoomLink })

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await adminEditScheduleFn({
        scheduleId: schedule.id,
        updates: {
          date,
          startTime,
          endTime,
          notes: notes || null,
          ...(isCcCouncil ? {} : { unitId: target.unitId || undefined }),
          ...(isVisit ? { wardName: target.wardName || null } : {}),
          ...(isInterview ? { presidentUid: presidentUid || null } : {}),
          ...(!isVisit ? { zoomLink: zoomLink.trim() || null } : {}),
          ...(!isVisit ? { customTitle: customTitle.trim() || null } : {}),
          ...(location.trim() ? { location: location.trim() } : {}),
          projectId: projectId || null,
          ...(isVisit ? { presidentAccompanied: presidentAccompanied || null } : {}),
          ...(isContact ? { relatedVisitId: relatedVisitId || null } : {}),
        },
      })
      onSaved()
      onClose()
    } catch (e: unknown) {
      const err = e as { message?: string; details?: string }
      setError(err?.details ?? err?.message ?? t('common.unknownError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {createPortal(
        <div className={styles.overlay} onClick={requestClose}>
          <div
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            className={styles.sheet}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.header}>
              <h3 className={styles.title}>{t('schedule.editTitle')}</h3>
              <button type="button" onClick={requestClose} className={styles.closeBtn} aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.fields}>
              {/* Stake/District — 협의 평의회는 대상 CC를 읽기 전용으로 보여 준다. TargetSection에는
                  대상을 아예 넘기지 않는다 — CF도 regionId 변경을 받지 않으므로 바꿀 수단이 없다. */}
              {isCcCouncil ? (
                <Input
                  label={t('schedule.ccRegionLabel')}
                  value={ccRegionName}
                  disabled
                  onChange={() => {}}
                />
              ) : (
                <TargetSection
                  type={schedule.type}
                  state={state}
                  onChange={applyPartial}
                  upcomingVisits={upcomingVisits}
                  unitOptions={unitOptions}
                  wardOptions={wardOptions}
                  ccRegionOptions={[]}
                  fixedKind={isVisit ? undefined : 'stake_president'}
                  stakeLabelKey={schedule.type === 'meeting' ? 'schedule.stakeLabelOptional' : 'schedule.stakeLabel'}
                />
              )}

              {/* Related visit — interview/meeting only: link/unlink the pre-visit meeting reminder */}
              {isContact && (
                <Select
                  label={t('schedule.relatedVisitLabel')}
                  value={relatedVisitId}
                  placeholder={
                    upcomingVisits.length === 0
                      ? t('schedule.relatedVisitNone')
                      : t('schedule.relatedVisitPlaceholder')
                  }
                  onChange={(e) => {
                    relatedVisitTouchedRef.current = true
                    set('relatedVisitId', e.target.value)
                  }}
                  options={upcomingVisits.map(v => ({
                    value: v.id,
                    label: t('schedule.relatedVisitOption', {
                      date: dayjs(v.date).format('M/D(ddd)'),
                      ward: v.wardName,
                    }),
                  }))}
                  disabled={upcomingVisits.length === 0 && !relatedVisitId}
                />
              )}

              {/* President — interview only, optional */}
              {isInterview && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>{t('schedule.presidentLabelOptional')}</label>
                  <select
                    className={styles.fieldSelect}
                    value={presidentUid}
                    onChange={e => setPresidentUid(e.target.value)}
                    disabled={!target.unitId}
                  >
                    <option value="">{t('common.select')}</option>
                    {presidentOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}

              <WhenSection
                type={schedule.type}
                state={state}
                onChange={applyPartial}
                hideSabbathToggle
              />

              <DetailSection
                type={schedule.type}
                state={state}
                onChange={applyPartial}
                autoTitle={autoTitle}
                autoLocation={autoLocation}
                canPickProject
              />
            </div>

            <div className={styles.actions}>
              {onDelete && (
                <button type="button" className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                  {t('common.delete')}
                </button>
              )}
              <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {onDelete && (
        <DeleteConfirmSheet
          open={showDeleteConfirm}
          description={deleteDescription}
          onConfirm={() => { setShowDeleteConfirm(false); onDelete() }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}
