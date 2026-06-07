import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Trash2, Calendar, Pencil } from 'lucide-react'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { manualCalendarSync } from '@/services/scheduleService'
import { useSchedules } from '@/hooks/useSchedules'
import { db } from '@/firebase'
import { REGIONS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Input, Button } from '@/components/ui'
import { ScheduleFormModal, EditScheduleModal } from '@/components/domain'
import type { Schedule } from '@/types'
import styles from './CalendarSettings.module.scss'

function scheduleTypeLabel(schedule: Schedule, t: (key: string) => string) {
  return schedule.type === 'ward_visit'
    ? t('schedule.type.ward_visit')
    : schedule.type === 'interview'
      ? t('schedule.type.interview')
      : t('schedule.type.meeting')
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
  const [formOpen, setFormOpen] = useState(false)

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
          <CardHeader
            title={t('admin.confirmedSchedules')}
            action={
              <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                + 일정 추가
              </Button>
            }
          />
          {formOpen && (
            <ScheduleFormModal
              onClose={() => setFormOpen(false)}
              onSaved={() => { setFormOpen(false); toast.success(t('schedule.savedSuccess')) }}
            />
          )}
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
          onSaved={() => setEditTarget(null)}
        />
      )}
      {cancelTarget && (
        <EditScheduleModal
          schedule={cancelTarget}
          initialConfirmDelete
          onClose={() => setCancelTarget(null)}
          onSaved={() => setCancelTarget(null)}
        />
      )}
    </AppShell>
  )
}
