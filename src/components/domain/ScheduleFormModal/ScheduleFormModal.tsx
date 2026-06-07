import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { httpsCallable } from 'firebase/functions'
import { useAtomValue } from 'jotai'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { functions } from '@/firebase'
import { useUsers } from '@/hooks/useUsers'
import { ALL_UNITS, getWardsByUnit } from '@/constants/regions'
import type { ScheduleType } from '@/types'
import { Button, Select, Input } from '@/components/ui'
import styles from './ScheduleFormModal.module.scss'

const adminCreateScheduleFn = httpsCallable(functions, 'adminCreateSchedule')

interface ScheduleFormModalProps {
  initialDate?: string
  initialType?: ScheduleType
  onClose: () => void
  onSaved: () => void
}

export function ScheduleFormModal({ initialDate, initialType, onClose, onSaved }: ScheduleFormModalProps) {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()

  const [type, setType] = useState<ScheduleType>(initialType ?? 'ward_visit')
  const [seventyUid, setSeventyUid] = useState(user.role === 'seventy' ? user.uid : '')
  const [unitId, setUnitId] = useState('')
  const [wardName, setWardName] = useState('')
  const [presidentUid, setPresidentUid] = useState('')
  const [date, setDate] = useState(initialDate ?? '')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [zoomLink, setZoomLink] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset unit/ward/president when seventy changes (skip on initial mount)
  const isFirstSeventyChange = useRef(true)
  useEffect(() => {
    if (isFirstSeventyChange.current) { isFirstSeventyChange.current = false; return }
    setUnitId(''); setWardName(''); setPresidentUid('')
  }, [seventyUid])

  // Reset ward and president when stake changes
  useEffect(() => { setWardName(''); setPresidentUid('') }, [unitId])

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const seventyUsers = users.filter(u => u.role === 'seventy')
  const selectedSeventy = users.find(u => u.uid === seventyUid)
  const seventyRegionIds = selectedSeventy?.regionIds ?? (selectedSeventy?.regionId ? [selectedSeventy.regionId] : [])
  const unitPool = seventyRegionIds.length > 0
    ? ALL_UNITS.filter(u => seventyRegionIds.includes(u.regionId ?? ''))
    : ALL_UNITS
  const unitOptions = unitPool.map(u => ({ value: u.id, label: u.name }))
  const wardOptions = unitId ? getWardsByUnit(unitId).map(w => ({ value: w.name, label: w.name })) : []
  const seventyOptions = seventyUsers.map(u => ({ value: u.uid, label: u.preRegistered ? u.name : `${u.name} ✓` }))
  const presidentOptions = users
    .filter(u => u.role === 'president' && u.unitId === unitId && !!unitId)
    .map(u => ({ value: u.uid, label: u.preRegistered ? u.name : `${u.name} ✓` }))

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!date || !startTime || !endTime) { setError(t('schedule.errorDateTimeRequired')); return }
    if (startTime >= endTime) { setError(t('admin.scheduleTimeError')); return }
    if (user.role === 'admin' && !seventyUid) { setError(t('schedule.errorSeventyRequired')); return }
    if (type === 'ward_visit' && (!unitId || !wardName)) { setError(t('schedule.errorStakeWardRequired')); return }
    if (type === 'interview' && !unitId) { setError(t('schedule.errorStakeRequired')); return }

    setSaving(true)
    try {
      await adminCreateScheduleFn({
        type,
        seventyUid,
        ...(unitId ? { unitId } : {}),
        ...(wardName ? { wardName } : {}),
        ...(presidentUid ? { presidentUid } : {}),
        date,
        startTime,
        endTime,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(zoomLink.trim() && type !== 'ward_visit' ? { zoomLink: zoomLink.trim() } : {}),
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

  const TYPE_TABS: Array<{ value: ScheduleType; label: string }> = [
    { value: 'ward_visit', label: t('schedule.type.ward_visit') },
    { value: 'interview', label: t('schedule.type.interview') },
    { value: 'meeting', label: t('schedule.type.meeting') },
  ]

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t('schedule.newTitle')}</h3>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        {/* Type segmented control — hidden when initialType is locked */}
        {!initialType && (
          <div className={styles.segmented}>
            {TYPE_TABS.map(tab => (
              <button
                key={tab.value}
                type="button"
                className={type === tab.value ? styles.segBtnActive : styles.segBtn}
                onClick={() => { setType(tab.value); setUnitId(''); setWardName(''); setPresidentUid('') }}
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
                value={seventyUid}
                onChange={e => setSeventyUid(e.target.value)}
                options={seventyOptions}
              />
            )}

            {/* Stake/District — required for ward_visit/interview, optional for meeting */}
            <Select
              label={type === 'meeting' ? t('schedule.stakeLabelOptional') : t('schedule.stakeLabel')}
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
              options={unitOptions}
            />

            {/* Ward — ward_visit only */}
            {type === 'ward_visit' && (
              <Select
                label={t('schedule.wardLabel')}
                value={wardName}
                onChange={e => setWardName(e.target.value)}
                options={wardOptions}
                disabled={!unitId}
              />
            )}

            {/* President — interview only, optional */}
            {type === 'interview' && (
              <Select
                label={t('schedule.presidentLabelOptional')}
                value={presidentUid}
                onChange={e => setPresidentUid(e.target.value)}
                options={presidentOptions}
                disabled={!unitId}
              />
            )}

            <Input
              type="date"
              label={t('schedule.dateLabel')}
              value={date}
              onChange={e => setDate(e.target.value)}
            />

            <div className={styles.timeRow}>
              <Input
                type="time"
                label={t('common.startTime')}
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
              <Input
                type="time"
                label={t('common.endTime')}
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>

            {type !== 'ward_visit' && (
              <Input
                label={t('schedule.zoomLinkOptional')}
                type="url"
                value={zoomLink}
                onChange={e => setZoomLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>{t('schedule.notesLabelOptional')}</label>
              <textarea
                className={styles.textarea}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('schedule.notesLabelOptional')}
                rows={3}
              />
            </div>
          </div>

          <div className={styles.footer}>
            <Button variant="ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('schedule.saveBtn')}</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
