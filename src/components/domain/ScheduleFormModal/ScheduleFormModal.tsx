import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { httpsCallable } from 'firebase/functions'
import { useAtomValue } from 'jotai'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { functions } from '@/firebase'
import { useUsers } from '@/hooks/useUsers'
import { useLeaders } from '@/hooks/useLeaders'
import { ALL_UNITS, getWardsByUnit } from '@/constants/regions'
import { isGeneralScheduleRelevant } from '@/types'
import type { ScheduleType, GeneralSchedule, AppUser } from '@/types'
import { Button, Select, Input, Textarea } from '@/components/ui'
import { ProjectPicker } from '@/components/domain/ProjectPicker/ProjectPicker'
import {
  buildNotesWithLeaderContact,
  getContactTargetOptions,
} from './leaderContactNotes'
import styles from './ScheduleFormModal.module.scss'

const adminCreateScheduleFn = httpsCallable(functions, 'adminCreateSchedule')

interface ScheduleFormModalProps {
  initialDate?: string
  initialType?: ScheduleType
  generalSchedules?: GeneralSchedule[]
  currentUser?: AppUser
  onClose: () => void
  onSaved: () => void
}

export function ScheduleFormModal({
  initialDate,
  initialType,
  generalSchedules,
  currentUser,
  onClose,
  onSaved,
}: ScheduleFormModalProps) {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()
  const { leaders } = useLeaders()

  const [type, setType] = useState<ScheduleType>(initialType ?? 'ward_visit')
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
  const [date, setDate] = useState(initialDate ?? '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [zoomLink, setZoomLink] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [isSabbath, setIsSabbath] = useState(false)
  const [presidentAccompanied, setPresidentAccompanied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleTypeChange = (nextType: ScheduleType) => {
    setType(nextType)
    setUnitId('')
    setWardName('')
    setPresidentUid('')
    setContactTargetValue('')
    setZoomLink('')
    setCustomTitle('')
    setNotes('')
  }

  const handleSeventyChange = (nextSeventyUid: string) => {
    setSeventyUid(nextSeventyUid)
    setUnitId('')
    setWardName('')
    setPresidentUid('')
    setContactTargetValue('')
  }

  const handleUnitChange = (nextUnitId: string) => {
    setUnitId(nextUnitId)
    setWardName('')
    setPresidentUid('')
    setContactTargetValue('')
  }

  const handleContactTargetChange = (nextValue: string) => {
    setContactTargetValue(nextValue)
    const option = contactTargetOptions.find(o => o.value === nextValue)
    setPresidentUid(option?.presidentUid ?? '')
  }

  const seventyUsers = users.filter((u) => u.role === 'seventy')
  const autoSeventyUid =
    user.role === 'admin' && !user.secondaryRole && seventyUsers.length === 1
      ? seventyUsers[0].uid
      : ''
  const effectiveSeventyUid = seventyUid || autoSeventyUid

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
  const unitPool =
    seventyRegionIds.length > 0
      ? ALL_UNITS.filter((u) => seventyRegionIds.includes(u.regionId ?? ''))
      : ALL_UNITS
  const unitOptions = unitPool.map((u) => ({ value: u.id, label: u.name.ko }))
  const wardOptions = unitId
    ? getWardsByUnit(unitId).map((w) => ({ value: w.name.ko, label: w.name.ko }))
    : []
  const seventyOptions = seventyUsers.map((u) => ({
    value: u.uid,
    label: u.preRegistered ? u.name : `${u.name} ✓`,
  }))
  const contactTargetOptions = getContactTargetOptions({ type, unitId, leaders, users })
  const selectedContactTarget = contactTargetOptions.find(o => o.value === contactTargetValue)

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
    if (type === 'interview' && !unitId) {
      setError(t('schedule.errorStakeRequired'))
      return
    }

    const finalNotes = buildNotesWithLeaderContact({
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
        ...(unitId ? { unitId } : {}),
        ...(wardName ? { wardName } : {}),
        ...(presidentUid ? { presidentUid } : {}),
        date,
        startTime,
        endTime,
        ...(finalNotes.trim() ? { notes: finalNotes.trim() } : {}),
        ...(zoomLink.trim() && type !== 'ward_visit' ? { zoomLink: zoomLink.trim() } : {}),
        ...(customTitle.trim() && type !== 'ward_visit' ? { customTitle: customTitle.trim() } : {}),
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

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>{t('schedule.newTitle')}</h3>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Type segmented control — hidden when initialType is locked */}
        {!initialType && (
          <div className={styles.segmented}>
            {TYPE_TABS.map((tab) => (
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

            {/* Stake/District — required for ward_visit/interview, optional for meeting */}
            <Select
              label={
                type === 'meeting' ? t('schedule.stakeLabelOptional') : t('schedule.stakeLabel')
              }
              value={unitId}
              onChange={(e) => handleUnitChange(e.target.value)}
              options={unitOptions}
            />

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

            {/* Contact target — interview: stake/district or ward/branch */}
            {type === 'interview' && (
              <Select
                label="접견 대상"
                value={contactTargetValue}
                onChange={(e) => handleContactTargetChange(e.target.value)}
                options={contactTargetOptions}
                disabled={!unitId}
              />
            )}

            {type === 'meeting' && unitId && (
              <Select
                label="대상 와드/지부"
                value={contactTargetValue}
                onChange={(e) => handleContactTargetChange(e.target.value)}
                options={contactTargetOptions}
              />
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

            {type !== 'ward_visit' && (
              <Input
                label={t('schedule.customTitleOptional')}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder={t('schedule.customTitlePlaceholder')}
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
            <Button variant="ghost" onClick={onClose} disabled={saving}>
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
