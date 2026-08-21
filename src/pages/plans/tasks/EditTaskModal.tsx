import { useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { updateTaskDetails } from '@/services/taskService'
import { Button, Input, Modal } from '@/components/ui'
import { MultiDatePicker } from '@/components/domain/MultiDatePicker/MultiDatePicker'
import type { Task } from '@/types'
import styles from './tasks.module.scss'

interface EditTaskModalProps {
  task: Task
  onClose: () => void
}

export function EditTaskModal({ task, onClose }: EditTaskModalProps) {
  const { t } = useTranslation()
  const isVisit = task.type === 'select_visit'
  const [dueDate, setDueDate] = useState(task.dueDate)
  // For ward visits: just select available Sundays
  const [availableDates, setAvailableDates] = useState<string[]>(task.availableDates ?? [])
  // For interview/sacrament: per-date time ranges
  const [selectedDates, setSelectedDates] = useState<string[]>(
    (task.availableDateSlots ?? []).map((s) => s.date),
  )
  const [dateRanges, setDateRanges] = useState<
    Record<string, { startTime: string; endTime: string }[]>
  >(
    Object.fromEntries(
      (task.availableDateSlots ?? []).map((s) => [
        s.date,
        s.timeRanges?.length ? s.timeRanges : [{ startTime: '09:00', endTime: '18:00' }],
      ]),
    ),
  )
  const [slotDuration, setSlotDuration] = useState(String(task.slotDurationMinutes ?? 60))
  const [saving, setSaving] = useState(false)

  function handleDatesChange(dates: string[]) {
    setSelectedDates(dates)
    setDateRanges((prev) => {
      const next: typeof prev = {}
      dates.forEach((d) => {
        next[d] = prev[d] ?? [{ startTime: '09:00', endTime: '18:00' }]
      })
      return next
    })
  }

  const availableDateSlots = selectedDates
    .map((d) => ({
      date: d,
      timeRanges: dateRanges[d] ?? [{ startTime: '09:00', endTime: '18:00' }],
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isVisit && availableDates.length === 0) {
      toast.error(t('taskProgress.errorSelectSunday'))
      return
    }
    if (!isVisit && availableDateSlots.length === 0) {
      toast.error(t('taskProgress.errorSelectDate'))
      return
    }
    setSaving(true)
    try {
      await updateTaskDetails(
        task.id,
        {
          dueDate,
          ...(isVisit
            ? { availableDates }
            : { availableDateSlots, slotDurationMinutes: parseInt(slotDuration) }),
        },
        task.status === 'responded',
      )
      toast.success(t('task.editSuccess'))
      onClose()
    } catch {
      toast.error(t('task.editFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={t('task.editTitle', { defaultValue: 'Task 수정' })}>
      <form className={styles.editForm} onSubmit={handleSave}>
        {isVisit ? (
          <div className={styles.editSection}>
            <p className={styles.editLabel}>
              {t('task.selectSundays', { defaultValue: '가능 방문 일요일 선택' })}
            </p>
            <MultiDatePicker selected={availableDates} onChange={setAvailableDates} sundayOnly />
          </div>
        ) : (
          <>
            <div className={styles.editSection}>
              <p className={styles.editLabel}>
                {t('task.selectDates', { defaultValue: '가능 날짜 (캘린더에서 선택)' })}
              </p>
              <MultiDatePicker selected={selectedDates} onChange={handleDatesChange} />
              {availableDateSlots.length > 0 && (
                <div className={styles.dateSlotList}>
                  {availableDateSlots.map((s) => (
                    <div key={s.date} className={styles.dateSlotItem}>
                      <div className={styles.dateSlotDate}>{dayjs(s.date).format('M/D (ddd)')}</div>
                      {(dateRanges[s.date] ?? []).map((r, idx) => (
                        <div key={idx} className={styles.timeRangeRow}>
                          <Input
                            type="time"
                            value={r.startTime}
                            className={styles.timeInput}
                            wrapperClassName={styles.timeField}
                            aria-label={`${dayjs(s.date).format('M/D')} ${t('common.startTime')}`}
                            onChange={(e) =>
                              setDateRanges((prev) => ({
                                ...prev,
                                [s.date]: prev[s.date].map((x, i) =>
                                  i === idx ? { ...x, startTime: e.target.value } : x,
                                ),
                              }))
                            }
                          />
                          <span>~</span>
                          <Input
                            type="time"
                            value={r.endTime}
                            className={styles.timeInput}
                            wrapperClassName={styles.timeField}
                            aria-label={`${dayjs(s.date).format('M/D')} ${t('common.endTime')}`}
                            onChange={(e) =>
                              setDateRanges((prev) => ({
                                ...prev,
                                [s.date]: prev[s.date].map((x, i) =>
                                  i === idx ? { ...x, endTime: e.target.value } : x,
                                ),
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Input
              label={t('slotDuration.label')}
              type="number"
              min="5"
              max="480"
              step="5"
              value={slotDuration}
              onChange={(e) => setSlotDuration(e.target.value)}
            />
          </>
        )}
        <Input
          label={t('task.dueDate')}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        {task.status === 'responded' && (
          <p className={styles.resetNote}>
            <AlertTriangle size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {t('task.resetWarning')}
          </p>
        )}
        <div className={styles.modalActions}>
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {t('task.editAndResend')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
