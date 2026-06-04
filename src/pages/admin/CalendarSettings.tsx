import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Trash2, Calendar, Pencil } from 'lucide-react'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { manualCalendarSync, deleteSchedule, updateSchedule } from '@/services/scheduleService'
import { useSchedules } from '@/hooks/useSchedules'
import { db } from '@/firebase'
import { REGIONS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Input, Button, Modal } from '@/components/ui'
import type { Schedule } from '@/types'
import styles from './CalendarSettings.module.scss'

function scheduleTypeLabel(schedule: Schedule, t: (key: string) => string) {
  return schedule.type === 'ward_visit'
    ? t('schedule.type.ward_visit')
    : schedule.type === 'interview'
      ? t('schedule.type.interview')
      : t('schedule.type.meeting')
}

function EditScheduleModal({
  schedule,
  onClose,
}: {
  schedule: Schedule
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [date, setDate] = useState(schedule.date)
  const [startTime, setStartTime] = useState(schedule.startTime)
  const [endTime, setEndTime] = useState(schedule.endTime)
  const [notes, setNotes] = useState(schedule.notes ?? '')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (endTime <= startTime) {
      toast.error(t('admin.scheduleTimeError'))
      return
    }
    setLoading(true)
    try {
      await updateSchedule(schedule.id, { date, startTime, endTime, notes: notes.trim() || undefined })
      toast.success(t('admin.scheduleEditSuccess'))
      onClose()
    } catch {
      toast.error(t('admin.scheduleEditFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={t('admin.scheduleEdit')}>
      <form className={styles.editForm} onSubmit={handleSave}>
        <div className={styles.editMeta}>
          <span className={styles.scheduleType}>{scheduleTypeLabel(schedule, t)}</span>
          {schedule.wardName && <span className={styles.scheduleWard}>{schedule.wardName}</span>}
        </div>
        <Input
          label={t('task.dueDate')}
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />
        <div className={styles.timeRow}>
          <Input
            label={t('common.startTime')}
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            required
          />
          <Input
            label={t('common.endTime')}
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            required
          />
        </div>
        <div className={styles.textareaField}>
          <label className={styles.textareaLabel}>{t('task.noteLabel')}</label>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder={t('admin.scheduleNotesPlaceholder')}
          />
        </div>
        {schedule.googleCalendarEventId && (
          <p className={styles.calendarHint}>{t('admin.scheduleEditCalendarHint')}</p>
        )}
        <div className={styles.modalActions}>
          <Button variant="ghost" type="button" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={loading}>{t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteScheduleModal({
  schedule,
  onClose,
  onDeleted,
}: {
  schedule: Schedule
  onClose: () => void
  onDeleted: () => void
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteSchedule(schedule.id)
      toast.success(t('admin.scheduleCancelSuccess'))
      onDeleted()
      onClose()
    } catch {
      toast.error(t('admin.scheduleCancelFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={t('admin.scheduleCancelTitle')}>
      <p className={styles.deleteDesc}>
        <strong>{dayjs(schedule.date).format('YYYY.MM.DD (ddd)')}</strong>
        {schedule.startTime && ` ${schedule.startTime}–${schedule.endTime}`}
        <br />
        {scheduleTypeLabel(schedule, t)}
        {schedule.wardName && ` · ${schedule.wardName}`}
        <br />
        {t('admin.scheduleCancelWarning')}
      </p>
      <div className={styles.modalActions}>
        <Button variant="ghost" type="button" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="danger" loading={loading} onClick={handleDelete}>{t('admin.scheduleDelete')}</Button>
      </div>
    </Modal>
  )
}

function ScheduleRow({
  schedule,
  onEdit,
  onCancel,
}: {
  schedule: Schedule
  onEdit: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className={styles.scheduleRow}>
      <div className={styles.scheduleDate}>
        <Calendar size={13} className={styles.scheduleDateIcon} />
        <span>{dayjs(schedule.date).format('YYYY.MM.DD (ddd)')}</span>
        {schedule.startTime && (
          <span className={styles.scheduleTime}>{schedule.startTime}–{schedule.endTime}</span>
        )}
      </div>
      <div className={styles.scheduleMeta}>
        <span className={styles.scheduleType}>{scheduleTypeLabel(schedule, t)}</span>
        {schedule.wardName && <span className={styles.scheduleWard}>{schedule.wardName}</span>}
        {schedule.googleCalendarEventId && (
          <span className={styles.calSynced}>{t('admin.calSynced')}</span>
        )}
      </div>
      <div className={styles.rowActions}>
        <button
          type="button"
          className={styles.editBtn}
          title={t('admin.scheduleEdit')}
          onClick={onEdit}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className={styles.cancelBtn}
          title={t('admin.scheduleDelete')}
          onClick={onCancel}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export function CalendarSettings() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const [calendarIds, setCalendarIds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Schedule | null>(null)

  const { schedules } = useSchedules({})
  const confirmedSchedules = schedules
    .filter(s => s.status === 'confirmed')
    .sort((a, b) => a.date.localeCompare(b.date))

  useEffect(() => {
    getDoc(doc(db, 'settings', 'calendar')).then(snap => {
      const data = snap.data()
      if (data?.calendars) setCalendarIds(data.calendars as Record<string, string>)
    }).finally(() => setFetching(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await setDoc(doc(db, 'settings', 'calendar'), { calendars: calendarIds }, { merge: true })
      toast.success(t('admin.calendarSaved'))
    } catch {
      toast.error(t('common.saveFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const result = await manualCalendarSync()
      toast.success(result.message)
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? t('common.syncError'))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={t('admin.calendar')} />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title={t('admin.calendar')} />
          <CardBody>
            <p className={styles.desc}>{t('admin.calendarDesc2')}</p>
            {fetching ? (
              <p className={styles.desc}>{t('common.loading')}</p>
            ) : (
              <form className={styles.form} onSubmit={handleSave}>
                {REGIONS.map(region => (
                  <Input
                    key={region.id}
                    label={`${region.name} ${t('admin.calendarRegionLabel')}`}
                    value={calendarIds[region.id] ?? ''}
                    onChange={e => setCalendarIds(prev => ({ ...prev, [region.id]: e.target.value }))}
                    placeholder="xxxxxxxx@group.calendar.google.com"
                  />
                ))}
                <Button type="submit" loading={loading}>{t('common.save')}</Button>
              </form>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('admin.confirmedSchedules')} />
          <CardBody>
            <p className={styles.desc}>{t('admin.confirmedSchedulesDesc')}</p>
            {confirmedSchedules.length === 0 ? (
              <p className={styles.empty}>{t('admin.noConfirmedSchedules')}</p>
            ) : (
              <div className={styles.scheduleList}>
                {confirmedSchedules.map(s => (
                  <ScheduleRow
                    key={s.id}
                    schedule={s}
                    onEdit={() => setEditTarget(s)}
                    onCancel={() => setCancelTarget(s)}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('calendar.syncCardTitle')} />
          <CardBody>
            <p className={styles.desc}>{t('calendar.syncCardDesc')}</p>
            <Button onClick={handleManualSync} loading={syncing} variant="secondary">
              <RefreshCw size={14} />
              &nbsp;{t('calendar.syncManual')}
            </Button>
          </CardBody>
        </Card>
      </div>

      {editTarget && (
        <EditScheduleModal
          schedule={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
      {cancelTarget && (
        <DeleteScheduleModal
          schedule={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDeleted={() => setCancelTarget(null)}
        />
      )}
    </AppShell>
  )
}
