import { useState, useEffect, useRef } from 'react'
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
import { ALL_UNITS, REGIONS, getWardsByUnit, getWardIdByName } from '@/constants/regions'
import { isGeneralScheduleRelevant } from '@/types'
import type { ScheduleType, GeneralSchedule, AppUser, InterviewTargetKind } from '@/types'
import { Button, Select, Input, Textarea } from '@/components/ui'
import { ProjectPicker } from '@/components/domain/ProjectPicker/ProjectPicker'
import { acquireScrollLock, releaseScrollLock } from '@/utils/scrollLock'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import {
  buildNotesWithLeaderContact,
  getContactTargetOptions,
} from './leaderContactNotes'
import { buildScheduleTitle, buildScheduleLocation } from '../../../../functions/src/scheduleRules'
import styles from './ScheduleFormModal.module.scss'

const adminCreateScheduleFn = httpsCallable(functions, 'adminCreateSchedule')

/** 대상 Select에서 'CC 내 스테이크 회장들'(협의 평의회)을 고른 상태 */
const CC_COUNCIL_TARGET = 'cc_council'

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

  const [type, setType] = useState<ScheduleType>(initialType ?? allowedTypes?.[0] ?? 'ward_visit')
  const [seventyUid, setSeventyUid] = useState(
    user.role === 'seventy' ? user.uid :
    user.role === 'exec_secretary' ? (user.assignedSeventyUid ?? '') :
    user.role === 'admin' && user.secondaryRole === 'seventy' ? user.uid :
    user.role === 'admin' && user.secondaryRole === 'exec_secretary' ? (user.assignedSeventyUid ?? '') :
    ''
  )
  const [unitId, setUnitId] = useState('')
  const [wardName, setWardName] = useState('')
  const [presidentUid, setPresidentUid] = useState('')
  const [contactTargetValue, setContactTargetValue] = useState('')
  const [targetSelect, setTargetSelect] = useState('')  // '', 'other', 'cc_council', 'unit:...', 'ward:...'
  const [ccRegionId, setCcRegionId] = useState('')      // 협의 평의회 대상 CC
  const [purpose, setPurpose] = useState<'general' | 'pre_visit'>('general')
  const [relatedVisitId, setRelatedVisitId] = useState('')
  const [date, setDate] = useState(initialDate ?? '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [zoomLink, setZoomLink] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [location, setLocation] = useState('')
  const [projectId, setProjectId] = useState('')
  const [isSabbath, setIsSabbath] = useState(false)
  const [presidentAccompanied, setPresidentAccompanied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guard against losing a filled form to a stray backdrop tap / Escape
  const isDirty =
    date !== (initialDate ?? '') ||
    startTime !== '' || endTime !== '' || notes !== '' || zoomLink !== '' ||
    customTitle !== '' || location !== '' || projectId !== '' || unitId !== '' || wardName !== '' ||
    contactTargetValue !== '' || targetSelect !== '' || ccRegionId !== '' ||
    isSabbath || presidentAccompanied
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

  const handleTypeChange = (nextType: ScheduleType) => {
    setType(nextType)
    setUnitId('')
    setWardName('')
    setPresidentUid('')
    setContactTargetValue('')
    setTargetSelect('')
    setCcRegionId('')
    setZoomLink('')
    setCustomTitle('')
    setLocation('')
    setNotes('')
    setPurpose('general')
    setRelatedVisitId('')
  }

  const handleSeventyChange = (nextSeventyUid: string) => {
    setSeventyUid(nextSeventyUid)
    setUnitId('')
    setWardName('')
    setPresidentUid('')
    setContactTargetValue('')
    setTargetSelect('')
    setCcRegionId('')
    setRelatedVisitId('')
  }

  const handleUnitChange = (nextUnitId: string) => {
    setUnitId(nextUnitId)
    setWardName('')
    setPresidentUid('')
    setContactTargetValue('')
    setTargetSelect('')
  }

  const seventyUsers = users.filter((u) => u.role === 'seventy')
  const autoSeventyUid =
    user.role === 'admin' && !user.secondaryRole && seventyUsers.length === 1
      ? seventyUsers[0].uid
      : ''
  const effectiveSeventyUid = seventyUid || autoSeventyUid

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
      setRelatedVisitId('')
    }
  }, [relatedVisitId, upcomingVisitsLoading, upcomingVisits])

  const handleSabbathToggle = (checked: boolean) => {
    setIsSabbath(checked)
    if (checked) {
      setStartTime('10:00')
      setEndTime('12:00')
    }
  }
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
  const wardOptions = unitId
    ? getWardsByUnit(unitId).map((w) => ({ value: w.name.ko, label: w.name.ko }))
    : []
  const seventyOptions = seventyUsers.map((u) => ({
    value: u.uid,
    label: u.preRegistered ? u.name : `${u.name} ✓`,
  }))
  const contactTargetOptions = getContactTargetOptions({ type, unitId, leaders, users })
  const selectedContactTarget = contactTargetOptions.find(o => o.label === contactTargetValue)
  const isCcCouncil = targetSelect === CC_COUNCIL_TARGET
  // 협의 평의회 대상 CC. 담당 칠십인이 정해졌으면 그 칠십인의 CC로 제한한다.
  const ccRegionOptions = (
    seventyRegionIds.length > 0
      ? REGIONS.filter(r => seventyRegionIds.includes(r.id))
      : effectiveSeventyUid ? [] : REGIONS
  ).map(r => ({ value: r.id, label: r.name }))
  const targetOptions = [
    // 협의 평의회는 특정 스테이크가 아니라 CC 전체가 대상이라 unitId와 무관하게 늘 고를 수 있다.
    ...(type === 'meeting' ? [{ value: CC_COUNCIL_TARGET, label: t('schedule.targetOptionCcCouncil') }] : []),
    ...contactTargetOptions.map(o => ({ value: o.value, label: o.label })),
    { value: 'other', label: t('schedule.targetOptionOther') },
  ]

  // 지금까지 채운 값만으로 실제 저장 시 생성될 제목·장소를 미리 보여준다
  // (customTitle/location을 사용자가 직접 채우면 placeholder는 무시된다).
  const autoParts = {
    type,
    unitName: ALL_UNITS.find((u) => u.id === unitId)?.name.ko,
    wardName: wardName || undefined,
    targetKind: targetSelect.startsWith('ward:') ? ('ward_bishop' as const)
      : targetSelect.startsWith('unit:') ? ('stake_president' as const)
      : targetSelect === CC_COUNCIL_TARGET ? ('cc_council' as const)
      : null,
    ccName: REGIONS.find((r) => r.id === ccRegionId)?.name,
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
    if (type === 'ward_visit' && (!unitId || !wardName)) {
      setError(t('schedule.errorStakeWardRequired'))
      return
    }

    // 접견/모임 대상 Select에서 targetKind/wardId 도출
    let targetKind: InterviewTargetKind | undefined
    let wardId: string | undefined
    if (type === 'interview' || type === 'meeting') {
      if (targetSelect === CC_COUNCIL_TARGET) targetKind = 'cc_council'
      else if (targetSelect.startsWith('unit:')) targetKind = 'stake_president'
      else if (targetSelect.startsWith('ward:')) {
        targetKind = 'ward_bishop'
        wardId = targetSelect.slice('ward:'.length)
      } else if (targetSelect === 'other') targetKind = 'other'
    }
    // 접견/모임은 대상 하나는 반드시 지정 (빈 접견 방지 + 대상에 따라 연락처를 노트에
    // 자동으로 채워주고, 분기 접견(스테이크 회장) 충족 여부를 targetKind로 판정하므로
    // 구조화된 대상이 필요하다)
    if (type === 'interview' || type === 'meeting') {
      if (!targetKind) {
        setError(t('schedule.errorTargetRequired'))
        return
      }
      if (targetKind === 'other' && !contactTargetValue.trim()) {
        setError(t('schedule.errorTargetNameRequired'))
        return
      }
      if (targetKind === 'cc_council' && !ccRegionId) {
        setError(t('schedule.errorCcRegionRequired'))
        return
      }
    }
    if ((type === 'interview' || type === 'meeting') && purpose === 'pre_visit' && !relatedVisitId) {
      setError(t('schedule.errorRelatedVisitRequired'))
      return
    }

    // 접견/모임에서 알려진 유닛/리더가 아니라 자유 입력한 일반 회원 이름이면 대상으로 기록
    const isFreeTextTarget =
      (type === 'interview' || type === 'meeting') &&
      contactTargetValue.trim() !== '' &&
      !selectedContactTarget
    // 협의 평의회는 붙일 유닛 리더가 하나로 정해지지 않으므로 연락처 자동 첨부를 건너뛴다.
    const finalNotes = isCcCouncil
      ? notes
      : isFreeTextTarget
      ? (notes.trim() ? `대상: ${contactTargetValue.trim()}\n${notes}` : `대상: ${contactTargetValue.trim()}`)
      : buildNotesWithLeaderContact({
          type,
          unitId,
          contactTargetUnitName: selectedContactTarget?.unitNameKo ?? '',
          notes,
          leaders,
        })

    setSaving(true)
    try {
      await adminCreateScheduleFn({
        type,
        seventyUid: effectiveSeventyUid,
        ...(unitId && !isCcCouncil ? { unitId } : {}),
        ...(isCcCouncil ? { regionId: ccRegionId } : {}),
        ...(wardName ? { wardName } : {}),
        ...(presidentUid && !isCcCouncil ? { presidentUid } : {}),
        ...(targetKind ? { targetKind } : {}),
        ...(wardId && !isCcCouncil ? { wardId } : {}),
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
        ...(type === 'ward_visit' ? { presidentAccompanied } : {}),
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

            {/* 협의 평의회는 CC 전체가 대상이라 스테이크 대신 CC를 고른다 */}
            {isCcCouncil ? (
              <Select
                label={t('schedule.ccRegionLabel')}
                value={ccRegionId}
                onChange={(e) => setCcRegionId(e.target.value)}
                options={ccRegionOptions}
                disabled={ccRegionOptions.length === 0}
              />
            ) : (
              /* Stake/District — required for ward_visit, optional for interview/meeting */
              <Select
                label={
                  type === 'ward_visit' ? t('schedule.stakeLabel') : t('schedule.stakeLabelOptional')
                }
                value={unitId}
                onChange={(e) => handleUnitChange(e.target.value)}
                options={unitOptions}
                disabled={unitSelectDisabled}
              />
            )}

            {/* Ward — ward_visit only */}
            {type === 'ward_visit' && (
              <Select
                label={t('schedule.wardLabel')}
                value={wardName}
                onChange={(e) => setWardName(e.target.value)}
                options={wardOptions}
                disabled={!unitId}
              />
            )}

            {/* Contact target — 구조화된 대상 Select(스테이크/지방부 회장, 와드/지부 감독) + 기타(직접 입력) */}
            {(type === 'interview' || type === 'meeting') && (
              <>
                {!isCcCouncil && (
                <Select
                  label={t('schedule.purposeLabel')}
                  value={purpose === 'general' ? '' : purpose}
                  placeholder={t('schedule.purposeGeneral')}
                  onChange={(e) => {
                    const next = (e.target.value || 'general') as 'general' | 'pre_visit'
                    setPurpose(next)
                    if (next === 'general') setRelatedVisitId('')
                  }}
                  options={[
                    { value: 'pre_visit', label: t('schedule.purposePreVisit') },
                  ]}
                />
                )}
                {purpose === 'pre_visit' && (
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
                        setRelatedVisitId(id)
                        const v = upcomingVisits.find(x => x.id === id)
                        if (v) {
                          setUnitId(v.unitId)
                          const wid = v.wardId ?? getWardIdByName(v.wardName)
                          if (wid) {
                            setTargetSelect(`ward:${wid}`)
                            // 수동 대상 선택 경로와 동일하게 contactTargetValue/presidentUid를
                            // 함께 채워야 노트에 (스테이크 회장이 아니라) 와드 감독 연락처가 붙는다.
                            const options = getContactTargetOptions({ type, unitId: v.unitId, leaders, users })
                            const opt = options.find(o => o.value === `ward:${wid}`)
                            setPresidentUid(opt?.presidentUid ?? '')
                            setContactTargetValue(opt?.label ?? v.wardName)
                          }
                        }
                      }}
                      options={upcomingVisits.map(v => ({
                        value: v.id,
                        label: t('schedule.relatedVisitOption', {
                          date: dayjs(v.date).format('M/D(ddd)'),
                          ward: v.wardName,
                        }),
                      }))}
                      disabled={upcomingVisits.length === 0}
                    />
                    {relatedVisit && (
                      <p className={styles.hint}>
                        {t('schedule.relatedVisitRecommendedBy', {
                          date: dayjs(relatedVisit.date).subtract(14, 'day').format('M/D'),
                        })}
                      </p>
                    )}
                  </>
                )}
                <Select
                  label={t('schedule.targetLabel')}
                  value={targetSelect}
                  onChange={(e) => {
                    const next = e.target.value
                    setTargetSelect(next)
                    const opt = contactTargetOptions.find(o => o.value === next)
                    setPresidentUid(opt?.presidentUid ?? '')
                    if (next === 'other') setContactTargetValue('')
                    else setContactTargetValue(opt?.label ?? '')
                    if (next === CC_COUNCIL_TARGET) {
                      // 스테이크 선택은 CC 선택으로 대체된다 — 남은 값이 payload로 새어 나가지 않게 비운다
                      setUnitId('')
                      setWardName('')
                      // 담당 CC가 하나뿐이면 굳이 고르게 하지 않는다
                      setCcRegionId(ccRegionOptions.length === 1 ? ccRegionOptions[0].value : '')
                      // 사전 준비 모임은 특정 와드 방문에 붙는 개념이라 협의 평의회에는 없다
                      setPurpose('general')
                      setRelatedVisitId('')
                    } else {
                      setCcRegionId('')
                    }
                  }}
                  options={targetOptions}
                />
                {targetSelect === 'other' && (
                  <Input
                    label={t('schedule.targetFreeTextLabel')}
                    value={contactTargetValue}
                    onChange={(e) => setContactTargetValue(e.target.value)}
                    placeholder={t('schedule.targetFreeTextPlaceholder')}
                  />
                )}
              </>
            )}

            {type === 'ward_visit' && (
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={isSabbath}
                  onChange={e => handleSabbathToggle(e.target.checked)}
                  className={styles.checkbox}
                  style={{ accentColor: 'var(--color-primary, #177C9C)' }}
                />
                <span className={styles.checkLabel}>{t('schedule.sabbathVisit')}</span>
              </label>
            )}

            {type === 'ward_visit' && (
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={presidentAccompanied}
                  onChange={e => setPresidentAccompanied(e.target.checked)}
                  className={styles.checkbox}
                  style={{ accentColor: 'var(--color-primary, #177C9C)' }}
                />
                <span className={styles.checkLabel}>{t('schedule.presidentAccompanied')}</span>
              </label>
            )}

            <Input
              type="date"
              label={t('schedule.dateLabel')}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {conflictingEvent && (
              <div className={styles.conflictWarning}>
                {t('generalSchedule.conflictWarning', { title: conflictingEvent.title })}
              </div>
            )}

            <div className={styles.timeRow}>
              <Input
                type="time"
                label={t('common.startTime')}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Input
                type="time"
                label={t('common.endTime')}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <Input
              label={t('schedule.locationOptional')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={autoLocation ?? ''}
            />

            {type !== 'ward_visit' && (
              <Input
                label={t('schedule.customTitleOptional')}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={autoTitle}
              />
            )}

            {type !== 'ward_visit' && (
              <Input
                label={t('schedule.zoomLinkOptional')}
                type="url"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            )}

            <Textarea
              label={t('schedule.notesLabelOptional')}
              className={styles.textarea}
              wrapperClassName={styles.fieldGroup}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('schedule.notesLabelOptional')}
              rows={3}
            />

            {(user.role === 'admin' || user.role === 'exec_secretary') && (
              <ProjectPicker value={projectId} onChange={setProjectId} />
            )}
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
