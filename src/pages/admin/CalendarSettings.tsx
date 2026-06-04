import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Trash2, Calendar } from 'lucide-react'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { manualCalendarSync, deleteSchedule } from '@/services/scheduleService'
import { useSchedules } from '@/hooks/useSchedules'
import { db } from '@/firebase'
import { REGIONS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Input, Button, Modal } from '@/components/ui'
import type { Schedule } from '@/types'
import styles from './CalendarSettings.module.scss'

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

  const typeLabel = schedule.type === 'ward_visit'
    ? t('schedule.type.ward_visit')
    : schedule.type === 'interview'
      ? t('schedule.type.interview')
      : t('schedule.type.meeting')

  return (
    <Modal open onClose={onClose} title={t('admin.scheduleCancelTitle')}>
      <p className={styles.deleteDesc}>
        <strong>{dayjs(schedule.date).format('YYYY.MM.DD (ddd)')}</strong>
        {schedule.startTime && ` ${schedule.startTime}–${schedule.endTime}`}
        <br />
        {typeLabel}
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

function ScheduleRow({ schedule, onCancel }: { schedule: Schedule; onCancel: () => void }) {
  const { t } = useTranslation()
  const typeLabel = schedule.type === 'ward_visit'
    ? t('schedule.type.ward_visit')
    : schedule.type === 'interview'
      ? t('schedule.type.interview')
      : t('schedule.type.meeting')

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
        <span className={styles.scheduleType}>{typeLabel}</span>
        {schedule.wardName && <span className={styles.scheduleWard}>{schedule.wardName}</span>}
        {schedule.googleCalendarEventId && (
          <span className={styles.calSynced}>{t('admin.calSynced')}</span>
        )}
      </div>
      <button
        type="button"
        className={styles.cancelBtn}
        title={t('admin.scheduleDelete')}
        onClick={onCancel}
      >
        <Trash2 size={14} />
      </button>
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
            <p className={styles.desc}>
              {t('admin.calendarDesc2')}
            </p>
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
                  <ScheduleRow key={s.id} schedule={s} onCancel={() => setCancelTarget(s)} />
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
