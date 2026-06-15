import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { httpsCallable } from 'firebase/functions'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { functions } from '@/firebase'
import { useUsers } from '@/hooks/useUsers'
import { ALL_UNITS, getWardsByUnit } from '@/constants/regions'
import type { Schedule } from '@/types'
import { ProjectPicker } from '@/components/domain/ProjectPicker/ProjectPicker'
import { DeleteConfirmSheet, Input, Textarea } from '@/components/ui'
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

  const [date, setDate] = useState(schedule.date)
  const [startTime, setStartTime] = useState(schedule.startTime)
  const [endTime, setEndTime] = useState(schedule.endTime)
  const [unitId, setUnitId] = useState(schedule.unitId ?? '')
  const [wardName, setWardName] = useState(schedule.wardName ?? '')
  const [presidentUid, setPresidentUid] = useState(schedule.presidentUid ?? '')
  const [note, setNote] = useState(schedule.notes ?? '')
  const [zoomLink, setZoomLink] = useState(schedule.zoomLink ?? '')
  const [customTitle, setCustomTitle] = useState(schedule.customTitle ?? '')
  const [projectId, setProjectId] = useState(schedule.projectId ?? '')
  const [presidentAccompanied, setPresidentAccompanied] = useState(schedule.presidentAccompanied ?? false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFirstUnitChange = useRef(true)
  useEffect(() => {
    if (isFirstUnitChange.current) { isFirstUnitChange.current = false; return }
    setWardName('')
    setPresidentUid('')
  }, [unitId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const isVisit = schedule.type === 'ward_visit'
  const isInterview = schedule.type === 'interview'

  const deleteDescription = schedule.type === 'ward_visit' && schedule.wardName
    ? `구역 방문 · ${schedule.wardName}`
    : t(`schedule.type.${schedule.type}`)

  const seventy = users.find(u => u.uid === schedule.seventyUid)
  const seventyRegionIds = seventy?.regionIds ?? (seventy?.regionId ? [seventy.regionId] : [])
  const unitPool = seventyRegionIds.length > 0
    ? ALL_UNITS.filter(u => seventyRegionIds.includes(u.regionId ?? ''))
    : ALL_UNITS
  const unitOptions = unitPool.map(u => ({ value: u.id, label: u.name.ko }))
  const wardOptions = unitId ? getWardsByUnit(unitId).map(w => ({ value: w.name.ko, label: w.name.ko })) : []
  const presidentOptions = users
    .filter(u => u.role === 'president' && u.unitId === unitId && !!unitId)
    .map(u => ({ value: u.uid, label: u.preRegistered ? u.name : `${u.name} ✓` }))

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
          notes: note || null,
          unitId: unitId || undefined,
          ...(isVisit ? { wardName: wardName || null } : {}),
          ...(isInterview ? { presidentUid: presidentUid || null } : {}),
          ...(!isVisit ? { zoomLink: zoomLink.trim() || null } : {}),
          ...(!isVisit ? { customTitle: customTitle.trim() || null } : {}),
          projectId: projectId || null,
          ...(isVisit ? { presidentAccompanied: presidentAccompanied || null } : {}),
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
        <div className={styles.overlay} onClick={onClose}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.header}>
              <h3 className={styles.title}>{t('schedule.editTitle')}</h3>
              <button type="button" onClick={onClose} className={styles.closeBtn} aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.fields}>
              {/* Stake/District */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  {t(schedule.type === 'meeting' ? 'schedule.stakeLabelOptional' : 'schedule.stakeLabel')}
                </label>
                <select
                  className={styles.fieldSelect}
                  value={unitId}
                  onChange={e => setUnitId(e.target.value)}
                >
                  <option value="">{t('common.select')}</option>
                  {unitOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Ward — ward_visit only */}
              {isVisit && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>{t('schedule.wardLabel')}</label>
                  <select
                    className={styles.fieldSelect}
                    value={wardName}
                    onChange={e => setWardName(e.target.value)}
                    disabled={!unitId}
                  >
                    <option value="">{t('common.select')}</option>
                    {wardOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}

              {/* President accompanied — ward_visit only */}
              {isVisit && (
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={presidentAccompanied}
                    onChange={e => setPresidentAccompanied(e.target.checked)}
                    className={styles.checkbox}
                    style={{ accentColor: 'var(--color-primary, #003057)' }}
                  />
                  <span className={styles.checkLabel}>{t('schedule.presidentAccompanied')}</span>
                </label>
              )}

              {/* President — interview only, optional */}
              {isInterview && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>{t('schedule.presidentLabelOptional')}</label>
                  <select
                    className={styles.fieldSelect}
                    value={presidentUid}
                    onChange={e => setPresidentUid(e.target.value)}
                    disabled={!unitId}
                  >
                    <option value="">{t('common.select')}</option>
                    {presidentOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}

              {/* Date */}
              <Input
                label={t('schedule.dateLabel')}
                type="date"
                className={styles.fieldInput}
                wrapperClassName={styles.fieldGroup}
                value={date}
                onChange={e => setDate(e.target.value)}
              />

              {/* Start / End time */}
              <div className={styles.timeRow}>
                <Input
                  label={t('common.startTime')}
                  type="time"
                  className={styles.fieldInput}
                  wrapperClassName={styles.fieldGroup}
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
                <Input
                  label={t('common.endTime')}
                  type="time"
                  className={styles.fieldInput}
                  wrapperClassName={styles.fieldGroup}
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>

              {/* Custom title — non-visit only */}
              {!isVisit && (
                <Input
                  label={t('schedule.customTitleOptional')}
                  className={styles.fieldInput}
                  wrapperClassName={styles.fieldGroup}
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder={t('schedule.customTitlePlaceholder')}
                />
              )}

              {/* Zoom link — non-visit only */}
              {!isVisit && (
                <Input
                  label={t('schedule.zoomLinkOptional')}
                  type="url"
                  className={styles.fieldInput}
                  wrapperClassName={styles.fieldGroup}
                  value={zoomLink}
                  onChange={e => setZoomLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                />
              )}

              {/* Notes */}
              <Textarea
                label={t('schedule.notesLabelOptional')}
                className={styles.fieldTextarea}
                wrapperClassName={styles.fieldGroup}
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
              />

              {/* Project */}
              <ProjectPicker value={projectId} onChange={setProjectId} />
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
