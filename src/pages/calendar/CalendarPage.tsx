import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { manualCalendarSync } from '@/services/scheduleService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { CalendarView, ScheduleItem, ScheduleFormModal } from '@/components/domain'
import styles from './CalendarPage.module.scss'

export function CalendarPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

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
  const { getUnitName } = useUnits()
  const filters = user.role === 'president'
    ? { presidentUid: user.uid }
    : user.role === 'seventy'
      ? { seventyUid: user.uid }
      : {}
  const { schedules } = useSchedules(filters)

  // Toggle: clicking the same date again deselects it
  const handleDateClick = (date: string) => {
    setSelectedDate(prev => prev === date ? null : date)
  }

  const daySchedules = selectedDate
    ? schedules.filter(s => s.status === 'confirmed' && s.date === selectedDate)
    : schedules
        .filter(s => s.status === 'confirmed' && s.date >= dayjs().format('YYYY-MM-DD'))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10)

  const listTitle = selectedDate
    ? t('calendar.selectedDateTitle', { date: dayjs(selectedDate).format('M/D (ddd)') })
    : t('calendar.upcomingTitle')

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext={t('calendar.subtext')} />}
    >
      <div className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.calendarCol}>
            <Card>
              <CardHeader
                title={t('calendar.title')}
                action={
                  // Admin can manually re-sync schedules to Google Calendar
                  user.role === 'admin' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleManualSync}
                      loading={syncing}
                      title={t('calendar.syncTitle')}
                    >
                      <RefreshCw size={14} />
                    </Button>
                  ) : undefined
                }
              />
              <CardBody>
                <CalendarView
                  schedules={schedules}
                  onDateClick={handleDateClick}
                  selectedDate={selectedDate}
                  getUnitName={getUnitName}
                />
              </CardBody>
            </Card>
          </div>
          <div className={styles.listCol}>
            <Card>
              <CardHeader
                title={listTitle}
                action={
                  <div className={styles.headerActions}>
                    {user.role === 'admin' && (
                      <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                        + 일정 추가
                      </Button>
                    )}
                    {selectedDate && (
                      <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={() => setSelectedDate(null)}
                        title={t('calendar.clearSelection')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                }
              />
              <CardBody>
                {daySchedules.length === 0
                  ? <p className={styles.empty}>{t('calendar.noSchedule')}</p>
                  : daySchedules.map(s => (
                      <ScheduleItem
                        key={s.id}
                        schedule={s}
                        unitName={getUnitName(s.unitId)}
                        showCalendarAdd={user.role === 'president'}
                      />
                    ))
                }
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
      {formOpen && (
        <ScheduleFormModal
          initialDate={selectedDate ?? undefined}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); toast.success('일정이 등록되었습니다.') }}
        />
      )}
    </AppShell>
  )
}
