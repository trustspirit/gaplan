import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase'
import styles from './EditScheduleModal.module.scss'

const adminEditScheduleFn = httpsCallable(functions, 'adminEditSchedule')
const adminDeleteScheduleFn = httpsCallable(functions, 'adminDeleteSchedule')

interface Schedule {
  id: string
  date: string
  startTime: string
  endTime: string
  note?: string
}

interface Props {
  schedule: Schedule
  onClose: () => void
  onSaved: () => void
}

export function EditScheduleModal({ schedule, onClose, onSaved }: Props) {
  const [date, setDate] = useState(schedule.date)
  const [startTime, setStartTime] = useState(schedule.startTime)
  const [endTime, setEndTime] = useState(schedule.endTime)
  const [note, setNote] = useState(schedule.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await adminEditScheduleFn({
        scheduleId: schedule.id,
        updates: { date, startTime, endTime, ...(note ? { note } : {}) },
      })
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
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
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>일정 편집</h3>
          <button type="button" onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.fields}>
          <label className={styles.fieldLabel}>날짜</label>
          <input type="date" className={styles.fieldInput} value={date} onChange={e => setDate(e.target.value)} />

          <label className={styles.fieldLabel}>시작 시간</label>
          <input type="time" className={styles.fieldInput} value={startTime} onChange={e => setStartTime(e.target.value)} />

          <label className={styles.fieldLabel}>종료 시간</label>
          <input type="time" className={styles.fieldInput} value={endTime} onChange={e => setEndTime(e.target.value)} />

          <label className={styles.fieldLabel}>메모</label>
          <textarea className={styles.fieldTextarea} value={note} onChange={e => setNote(e.target.value)} rows={3} />
        </div>

        <div className={styles.actions}>
          {confirmDelete ? (
            <div className={styles.deleteConfirm}>
              <p className={styles.deleteConfirmText}>
                일정을 삭제하면 Google Calendar에서도 삭제됩니다. 계속할까요?
              </p>
              <div className={styles.deleteConfirmBtns}>
                <button type="button" className={styles.cancelBtn} onClick={() => setConfirmDelete(false)}>취소</button>
                <button type="button" className={styles.deleteBtn} onClick={handleDelete} disabled={saving}>
                  {saving ? '삭제 중...' : '삭제 확인'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <button type="button" className={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>삭제</button>
              <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
