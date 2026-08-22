import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { httpsCallable } from 'firebase/functions'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { functions } from '@/firebase'
import { useUsers } from '@/hooks/useUsers'
import { useLeaders } from '@/hooks/useLeaders'
import { useUpcomingVisits } from '@/hooks/useUpcomingVisits'
import { ALL_UNITS, REGIONS, getWardsByUnit } from '@/constants/regions'
import { isGeneralScheduleRelevant } from '@/types'
import type { ScheduleType, GeneralSchedule, AppUser } from '@/types'
import { Button, Select, Input } from '@/components/ui'
import { acquireScrollLock, releaseScrollLock } from '@/utils/scrollLock'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { buildNotesWithLeaderContact, stakeTargetLabel, wardTargetLabel } from './leaderContactNotes'
import { buildScheduleTitle, buildScheduleLocation } from '../../../../functions/src/scheduleRules'
import { useScheduleForm } from '../scheduleForm/useScheduleForm'
import type { ScheduleFormState } from '../scheduleForm/useScheduleForm'
import { toTargetPayload } from '../scheduleForm/scheduleTargetRules'
import { TargetSection } from '../scheduleForm/TargetSection'
import { WhenSection } from '../scheduleForm/WhenSection'
import { DetailSection } from '../scheduleForm/DetailSection'
import styles from './ScheduleFormModal.module.scss'

const adminCreateScheduleFn = httpsCallable(functions, 'adminCreateSchedule')

interface ScheduleFormModalProps {
  initialDate?: string
  initialType?: ScheduleType
  allowedTypes?: ScheduleType[]
  generalSchedules?: GeneralSchedule[]
  currentUser?: AppUser
  onClose: () => void
  onSaved: () => void
}

export function ScheduleFormModal({
  initialDate,
  initialType,
  allowedTypes,
  generalSchedules,
  currentUser,
  onClose,
  onSaved,
}: ScheduleFormModalProps) {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()
  const { leaders } = useLeaders()

  const { state, set, setTargetKind, setType, isDirty } = useScheduleForm({
    type: initialType ?? allowedTypes?.[0] ?? 'ward_visit',
    date: initialDate ?? '',
  })
  const { type, target, date, startTime, endTime, purpose, relatedVisitId, notes, zoomLink, customTitle, location, projectId } = state

  // 조각(TargetSection/WhenSection/DetailSection)들은 { state, onChange } 계약을 쓴다 —
  // onChange는 부분 병합. useScheduleForm의 set(key, value)를 그 모양으로 감싼다.
  const applyPartial = (partial: Partial<ScheduleFormState>) => {
    ;(Object.keys(partial) as Array<keyof ScheduleFormState>).forEach((key) => {
      set(key, partial[key] as ScheduleFormState[typeof key])
    })
  }

  const [seventyUid, setSeventyUid] = useState(
    user.role === 'seventy' ? user.uid :
    user.role === 'exec_secretary' ? (user.assignedSeventyUid ?? '') :
    user.role === 'admin' && user.secondaryRole === 'seventy' ? user.uid :
    user.role === 'admin' && user.secondaryRole === 'exec_secretary' ? (user.assignedSeventyUid ?? '') :
    ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestClose = () => {
    if (isDirty && !window.confirm(t('common.discardChanges'))) return
    onClose()
  }

  const sheetRef = useRef<HTMLDivElement>(null)
  useFocusTrap(sheetRef, true, requestClose)
  useEffect(() => {
    acquireScrollLock()
    return releaseScrollLock
  }, [])

  // 종류를 바꾸면 대상(target)·목적(purpose)은 useScheduleForm의 규칙이 알아서 지운다.
  // 여기서는 그 규칙이 모르는, 종류에 딸린 나머지 선택 칸(제목/장소/Zoom/메모/대상 방문)만 비운다 —
  // 예전 handleTypeChange가 지우던 목록과 정확히 같다.
  const handleTypeChange = (nextType: ScheduleType) => {
    setType(nextType)
    set('zoomLink', '')
    set('customTitle', '')
    set('location', '')
    set('notes', '')
    set('relatedVisitId', '')
  }

  // 담당 칠십인이 바뀌면 그 사람 담당 범위 밖일 수 있는 대상 선택을 지운다(예전과 동일).
  const handleSeventyChange = (nextSeventyUid: string) => {
    setSeventyUid(nextSeventyUid)
    setTargetKind('')
    set('relatedVisitId', '')
  }

  const seventyUsers = users.filter((u) => u.role === 'seventy')
  const autoSeventyUid =
    user.role === 'admin' && !user.secondaryRole && seventyUsers.length === 1
      ? seventyUsers[0].uid
      : ''
  const effectiveSeventyUid = seventyUid || autoSeventyUid

  // 담당 칠십인 범위로 스테이크/지방부·CC 목록을 미리 거른다(Controller ruling R2,
  // 2026-08-22 — TargetSection은 users 목록이 없어 스스로 이 범위를 계산할 수 없으므로
  // 모달이 계산해 read-only 데이터로 내려준다). 예전 ScheduleFormModal의 unitPool/
  // unitSelectDisabled/ccRegionOptions 계산을 그대로 옮긴 것이다.
  const selectedSeventy = users.find((u) => u.uid === effectiveSeventyUid)
  const seventyRegionIds =
    selectedSeventy?.regionIds ?? (selectedSeventy?.regionId ? [selectedSeventy.regionId] : [])
  const waitingForSeventyScope = !!effectiveSeventyUid && !selectedSeventy
  const unitPool =
    !effectiveSeventyUid
      ? ALL_UNITS
      : waitingForSeventyScope
        ? []
        : seventyRegionIds.length > 0
      ? ALL_UNITS.filter((u) => seventyRegionIds.includes(u.regionId ?? ''))
      : []
  const unitOptions = unitPool.map((u) => ({ value: u.id, label: u.name.ko }))
  const unitSelectDisabled = waitingForSeventyScope || (!!effectiveSeventyUid && unitOptions.length === 0)
  const ccRegionOptions = (
    seventyRegionIds.length > 0
      ? REGIONS.filter((r) => seventyRegionIds.includes(r.id))
      : effectiveSeventyUid ? [] : REGIONS
  ).map((r) => ({ value: r.id, label: r.name }))

  // TargetSection은 leaders/users를 갖지 않는다 — 라벨을 붙이는 계산은 모두 여기서 한다
  // (Controller ruling R8/R9, 2026-08-22). 두 select 모두 "무엇을 고르든 같은 목록"이
  // 아니라, 고른 대상 유형에 따라 그 옵션이 실제 대상(=연락처가 붙을 리더)인지 아닌지가
  // 갈린다 — 대상 유형이 stake_president일 때만 스테이크 select 자체가 대상이므로
  // 그때만 리더 역할 라벨("서울 스테이크 · 스테이크 회장")을 붙인다. ward_visit이나
  // ward_bishop 선택 중 와드를 좁히기 위한 스테이크 select는 예전에도 늘 평범한 이름만
  // 보여줬으므로 그대로 둔다.
  const unitOptionsForTargetSection =
    target.kind === 'stake_president'
      ? unitOptions.map((o) => ({ value: o.value, label: stakeTargetLabel(o.label, leaders) }))
      : unitOptions
  // 와드 select는 ward_bishop 대상을 고를 때만 나타나므로(questionsFor), 나타날 때는
  // 항상 "그 와드가 곧 대상"이다 — 늘 리더 역할 라벨을 붙인다. ward_visit의 와드
  // select는 이 목록을 쓰지 않는 별개 렌더 분기라 영향받지 않는다(TargetSection.tsx).
  const wardOptionsForTargetSection = target.unitId
    ? getWardsByUnit(target.unitId).map((w) => ({
        value: w.name.ko,
        label: type === 'ward_visit' ? w.name.ko : wardTargetLabel(w.name.ko, leaders),
      }))
    : []

  const { visits: upcomingVisits, loading: upcomingVisitsLoading } = useUpcomingVisits(
    type === 'interview' || type === 'meeting' ? effectiveSeventyUid : '',
    date || dayjs().format('YYYY-MM-DD'),
  )
  const relatedVisit = upcomingVisits.find(v => v.id === relatedVisitId)

  // 고른 대상 방문이 목록에서 사라지면(날짜를 방문 이후로 변경, 담당 칠십인 변경 등) stale id를
  // 그대로 서버로 보내지 않도록 지운다. 목록 로딩 중에는 아직 판단할 수 없으니 건드리지 않는다.
  useEffect(() => {
    if (!relatedVisitId || upcomingVisitsLoading) return
    if (!upcomingVisits.some(v => v.id === relatedVisitId)) {
      set('relatedVisitId', '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedVisitId, upcomingVisitsLoading, upcomingVisits])

  const seventyOptions = seventyUsers.map((u) => ({
    value: u.uid,
    label: u.preRegistered ? u.name : `${u.name} ✓`,
  }))

  // 대상 규칙 모듈이 유형에 따라 payload에 실릴 unitId/wardName/regionId/targetKind(/wardId)를
  // 정한다. ward_visit은 「대상」이라는 개념이 없어(방문하는 곳 자체가 대상) target.kind가 늘
  // ''로 남는다 — toTargetPayload는 그때 모든 칸을 비우므로, ward_visit의 유닛/와드는 target에서
  // 직접 읽는다.
  const targetPayload = toTargetPayload(target)
  const payloadUnitId = type === 'ward_visit' ? target.unitId : targetPayload.unitId
  const payloadWardName = type === 'ward_visit' ? target.wardName : targetPayload.wardName
  const isCcCouncil = targetPayload.targetKind === 'cc_council'

  // 스테이크 회장 대상을 고르면 그 스테이크 회장 계정의 uid를 함께 싣는다(예전에는
  // getContactTargetOptions와 같은 계산이었지만, 그 함수는 프로덕션에서 안 쓰여 M5
  // (2026-08-22)에서 지웠다: role === 'president' && unitId 일치).
  const presidentUid =
    targetPayload.targetKind === 'stake_president'
      ? users.find((u) => u.role === 'president' && u.unitId === target.unitId)?.uid
      : undefined

  // 지금까지 채운 값만으로 실제 저장 시 생성될 제목·장소를 미리 보여준다
  // (customTitle/location을 사용자가 직접 채우면 placeholder는 무시된다).
  const autoParts = {
    type,
    unitName: ALL_UNITS.find((u) => u.id === payloadUnitId)?.name.ko,
    wardName: payloadWardName || undefined,
    targetKind: targetPayload.targetKind,
    ccName: REGIONS.find((r) => r.id === target.ccRegionId)?.name,
    preVisitWardName: purpose === 'pre_visit' ? relatedVisit?.wardName : undefined,
  }
  const autoTitle = buildScheduleTitle(autoParts)
  const autoLocation = buildScheduleLocation({ ...autoParts, zoomLink })

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!date || !startTime || !endTime) {
      setError(t('schedule.errorDateTimeRequired'))
      return
    }
    if (startTime >= endTime) {
      setError(t('admin.scheduleTimeError'))
      return
    }
    if ((user.role === 'admin' || user.role === 'exec_secretary') && !effectiveSeventyUid) {
      setError(t('schedule.errorSeventyRequired'))
      return
    }
    if (type === 'ward_visit' && (!target.unitId || !target.wardName)) {
      setError(t('schedule.errorStakeWardRequired'))
      return
    }
    // 접견/모임은 대상 하나는 반드시 지정 (빈 접견 방지 + 대상에 따라 연락처를 노트에
    // 자동으로 채워주고, 분기 접견(스테이크 회장) 충족 여부를 targetKind로 판정하므로
    // 구조화된 대상이 필요하다)
    if (type === 'interview' || type === 'meeting') {
      if (!targetPayload.targetKind) {
        setError(t('schedule.errorTargetRequired'))
        return
      }
      if (targetPayload.targetKind === 'other' && !target.freeText.trim()) {
        setError(t('schedule.errorTargetNameRequired'))
        return
      }
      if (targetPayload.targetKind === 'cc_council' && !target.ccRegionId) {
        setError(t('schedule.errorCcRegionRequired'))
        return
      }
    }
    if ((type === 'interview' || type === 'meeting') && purpose === 'pre_visit' && !relatedVisitId) {
      setError(t('schedule.errorRelatedVisitRequired'))
      return
    }

    // 접견/모임에서 알려진 유닛/리더가 아니라 자유 입력한 일반 회원 이름이면 대상으로 기록
    const isFreeTextTarget = targetPayload.targetKind === 'other'
    // 노트에 붙일 연락처의 소속 이름 — ward_bishop은 그 와드의 한글 이름, stake_president는
    // 그 스테이크/지방부의 한글 이름. wardId/unitId만으로는 CF가 이름을 못 붙인다(functions/에는
    // 이름 테이블이 없다) — 그래서 이 이름 자체를 여기서 구해 싣는다.
    const contactTargetUnitName =
      type === 'ward_visit'
        ? ''
        : targetPayload.targetKind === 'ward_bishop'
        ? target.wardName
        : targetPayload.targetKind === 'stake_president'
        ? (ALL_UNITS.find((u) => u.id === target.unitId)?.name.ko ?? '')
        : ''
    // 협의 평의회는 붙일 유닛 리더가 하나로 정해지지 않으므로 연락처 자동 첨부를 건너뛴다.
    const finalNotes = isCcCouncil
      ? notes
      : isFreeTextTarget
      ? (notes.trim() ? `대상: ${target.freeText.trim()}\n${notes}` : `대상: ${target.freeText.trim()}`)
      : buildNotesWithLeaderContact({
          type,
          unitId: payloadUnitId,
          contactTargetUnitName,
          notes,
          leaders,
        })

    setSaving(true)
    try {
      await adminCreateScheduleFn({
        type,
        seventyUid: effectiveSeventyUid,
        ...(payloadUnitId && !isCcCouncil ? { unitId: payloadUnitId } : {}),
        ...(isCcCouncil ? { regionId: targetPayload.regionId } : {}),
        ...(payloadWardName ? { wardName: payloadWardName } : {}),
        ...(presidentUid && !isCcCouncil ? { presidentUid } : {}),
        ...(targetPayload.targetKind ? { targetKind: targetPayload.targetKind } : {}),
        ...(targetPayload.wardId && !isCcCouncil ? { wardId: targetPayload.wardId } : {}),
        ...((type === 'interview' || type === 'meeting') && purpose === 'pre_visit' && relatedVisitId
          ? { relatedVisitId }
          : {}),
        date,
        startTime,
        endTime,
        ...(finalNotes.trim() ? { notes: finalNotes.trim() } : {}),
        ...(zoomLink.trim() && type !== 'ward_visit' ? { zoomLink: zoomLink.trim() } : {}),
        ...(customTitle.trim() && type !== 'ward_visit' ? { customTitle: customTitle.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(projectId ? { projectId } : {}),
        ...(type === 'ward_visit' ? { presidentAccompanied: state.presidentAccompanied } : {}),
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

  const conflictingEvent = date
    ? (generalSchedules ?? []).find(gs => {
        if (gs.date !== date) return false
        if (!currentUser) return true
        return isGeneralScheduleRelevant(gs, currentUser)
      })
    : undefined

  const TYPE_TABS: Array<{ value: ScheduleType; label: string }> = [
    { value: 'ward_visit', label: t('schedule.type.ward_visit') },
    { value: 'interview', label: t('schedule.type.interview') },
    { value: 'meeting', label: t('schedule.type.meeting') },
  ]
  const typeTabs = allowedTypes ? TYPE_TABS.filter(tab => allowedTypes.includes(tab.value)) : TYPE_TABS

  return createPortal(
    <div className={styles.overlay} onClick={requestClose}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>{t('schedule.newTitle')}</h3>
          <button
            type="button"
            onClick={requestClose}
            className={styles.closeBtn}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Type segmented control — hidden when initialType is locked */}
        {!initialType && (
          <div className={styles.segmented}>
            {typeTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={type === tab.value ? styles.segBtnActive : styles.segBtn}
                onClick={() => handleTypeChange(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSave}>
          <div className={styles.fields}>
            {/* Seventy selector — admin only */}
            {user.role === 'admin' && (
              <Select
                label={t('schedule.seventyLabel')}
                value={effectiveSeventyUid}
                onChange={(e) => handleSeventyChange(e.target.value)}
                options={seventyOptions}
              />
            )}

            {user.role === 'exec_secretary' && (
              <Input
                label={t('schedule.seventyLabel')}
                value={users.find(u => u.uid === effectiveSeventyUid)?.name ?? effectiveSeventyUid}
                disabled
                onChange={() => {}}
              />
            )}

            <TargetSection
              type={type}
              state={state}
              onChange={applyPartial}
              upcomingVisits={upcomingVisits}
              unitOptions={unitOptionsForTargetSection}
              unitSelectDisabled={unitSelectDisabled}
              wardOptions={wardOptionsForTargetSection}
              ccRegionOptions={ccRegionOptions}
            />

            <WhenSection
              type={type}
              state={state}
              onChange={applyPartial}
              conflictingEvent={conflictingEvent}
            />

            <DetailSection
              type={type}
              state={state}
              onChange={applyPartial}
              autoTitle={autoTitle}
              autoLocation={autoLocation}
              canPickProject={user.role === 'admin' || user.role === 'exec_secretary'}
            />
          </div>

          <div className={styles.footer}>
            <Button variant="ghost" onClick={requestClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {t('schedule.saveBtn')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
