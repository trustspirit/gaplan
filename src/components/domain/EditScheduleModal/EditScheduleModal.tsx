import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { useTranslation } from 'react-i18next'
import { functions } from '@/firebase'
import styles from './EditScheduleModal.module.scss'

const adminEditScheduleFn = httpsCallable(functions, 'adminEditSchedule')
const adminDeleteScheduleFn = httpsCallable(functions, 'adminDeleteSchedule')

interface Schedule {
  id: string
  date: string
  startTime: string
  endTime: string
  notes?: string
}

interface Props {
  schedule: Schedule
  onClose: () => void
  onSaved: () => void
}

export function EditScheduleModal({ schedule, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [date, setDate] = useState(schedule.date)
  const [startTime, setStartTime] = useState(schedule.startTime)
  const [endTime, setEndTime] = useState(schedule.endTime)
  const [note, setNote] = useState(schedule.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await adminEditScheduleFn({
        scheduleId: schedule.id,
        updates: { date, startTime, endTime, notes: note },
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

  const handleDelete = async () => {
    setSaving(true)
    setError(null)
    try {
      await adminDeleteScheduleFn({ scheduleId: schedule.id })
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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t('schedule.editTitle')}</h3>
          <button type="button" onClick={onClose} className={styles.closeBtn}>{t('common.close')}</button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.fields}>
          <label className={styles.fieldLabel}>{t('schedule.dateLabel')}</label>
          <input type="date" className={styles.fieldInput} value={date} onChange={e => setDate(e.target.value)} />

          <label className={styles.fieldLabel}>{t('common.startTime')}</label>
          <input type="time" className={styles.fieldInput} value={startTime} onChange={e => setStartTime(e.target.value)} />

          <label className={styles.fieldLabel}>{t('common.endTime')}</label>
          <input type="time" className={styles.fieldInput} value={endTime} onChange={e => setEndTime(e.target.value)} />

          <label className={styles.fieldLabel}>{t('schedule.notesLabelOptional')}</label>
          <textarea className={styles.fieldTextarea} value={note} onChange={e => setNote(e.target.value)} rows={3} />
        </div>

        <div className={styles.actions}>
          {confirmDelete ? (
            <div className={styles.deleteConfirm}>
              <p className={styles.deleteConfirmText}>{t('schedule.deleteConfirmText')}</p>
              <div className={styles.deleteConfirmBtns}>
                <button type="button" className={styles.cancelBtn} onClick={() => setConfirmDelete(false)}>
                  {t('common.cancel')}
                </button>
                <button type="button" className={styles.deleteBtn} onClick={handleDelete} disabled={saving}>
                  {saving ? t('common.loading') : t('common.confirm')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>
                {t('common.delete')}
              </button>
              <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
