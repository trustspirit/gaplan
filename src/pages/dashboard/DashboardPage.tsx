import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { Calendar, CheckCircle2 } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useTasks } from '@/hooks/useTasks'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { useTaskConfirm } from '@/hooks/useTaskConfirm'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useScheduleDateRange } from '@/hooks/useScheduleDateRange'
import { subscribeToSharedCalendar } from '@/services/calendarService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Skeleton, Button, Modal, BottomSheet } from '@/components/ui'
import { TaskCard, ScheduleItem, CalendarView, TaskPickerContent, taskPickerTitle, ScheduleDateRangeFilter } from '@/components/domain'
import { useWardSubmit } from '@/hooks/useWardSubmit'
import { REGIONS } from '@/constants/regions'
import styles from './DashboardPage.module.scss'

function CalendarBanner({ connected }: { connected?: boolean }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      await subscribeToSharedCalendar()
      toast.success(t('schedule.calendarSuccess'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '연동에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.calendarBanner}>
      <Calendar size={16} color="var(--color-primary, #177C9C)" />
      <span className={styles.calendarBannerText}>
        {t('schedule.calendarBannerText')}
      </span>
      {connected ? (
        <div className={styles.calendarConnected}>
          <CheckCircle2 size={14} />
          {t('schedule.calendarConnected')}
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={handleConnect} loading={loading}>
          {t('schedule.calendarSubscribe')}
        </Button>
      )}
    </div>
  )
}

function PresidentDashboard() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { tasks, loading: tasksLoading } = useTasks(user.uid)
  const { schedules, loading: schedulesLoading } = useSchedules({ presidentUid: user.uid })
  const { getUnitName } = useUnits()
  const isMobile = useIsMobile()
  const {
    activeTask, selectedSlot: _selectedSlot,
    selectedSlots, toggleSlot, isSlotSelected,
    submitting, availableSlots,
    openTask, closeTask, handleSubmitAvailability,
  } = useTaskConfirm(user.uid, user.unitId)

  const { handleSubmitWards, wardSubmitting } = useWardSubmit(activeTask, closeTask)

  const upcoming = schedules
    .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const pickerTitle = taskPickerTitle(activeTask)

  const pickerContent = activeTask ? (
    <TaskPickerContent
      activeTask={activeTask}
      user={user}
      availableSlots={availableSlots}
      isSlotSelected={isSlotSelected}
      onToggleSlot={toggleSlot}
      slotSubmitting={submitting}
      selectedSlots={selectedSlots}
      onSubmitAvailability={handleSubmitAvailability}
      onSubmitWards={handleSubmitWards}
      wardSubmitting={wardSubmitting}
    />
  ) : null

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext={dayjs().format('YYYY년 M월')} pendingCount={tasks.length} />}
    >
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <Card>
            <CardHeader title={t('task.needsAction')} />
            <CardBody>
              {tasksLoading
                ? [1, 2].map(i => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
                : tasks.length === 0
                  ? <p className={styles.empty}>{t('task.noTasks')}</p>
                  : tasks.map(t => <TaskCard key={t.id} task={t} onAction={openTask} />)
              }
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('schedule.upcoming')} />
            <CardBody>
              {schedulesLoading
                ? [1, 2].map(i => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
                : upcoming.length === 0
                  ? <p className={styles.empty}>{t('schedule.noUpcoming')}</p>
                  : upcoming.map(s => (
                      <ScheduleItem key={s.id} schedule={s} unitName={getUnitName(s.unitId)} showCalendarAdd />
                    ))
              }
            </CardBody>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card>
            <CardHeader title={t('nav.calendar')} />
            <CardBody>
              <CalendarView schedules={schedules} />
            </CardBody>
          </Card>
        </div>
      </div>

      {isMobile ? (
        <BottomSheet open={!!activeTask} onClose={closeTask} title={pickerTitle}>
          {pickerContent}
        </BottomSheet>
      ) : (
        <Modal open={!!activeTask} onClose={closeTask} title={pickerTitle}>
          {pickerContent}
        </Modal>
      )}
    </AppShell>
  )
}

function SeventyDashboard() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { schedules } = useSchedules({ seventyUid: user.uid })
  const { getUnitName } = useUnits()
  const regionName = REGIONS.find(r => r.id === user.regionId)?.name ?? user.regionId ?? ''

  const upcoming = schedules
    .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  const thisMonthCount = schedules.filter(
    s => s.status === 'confirmed' && dayjs(s.date).format('YYYY-M') === dayjs().format('YYYY-M')
  ).length

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext={regionName} />}
    >
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <CalendarBanner connected={user.calendarConnected} />

          <Card>
            <CardHeader
              title={t('schedule.upcoming')}
              action={<span style={{ fontSize: '0.8125rem', color: '#808081' }}>{t('schedule.thisMonth', { count: thisMonthCount })}</span>}
            />
            <CardBody>
              {upcoming.length === 0
                ? <p className={styles.empty}>{t('schedule.noUpcoming')}</p>
                : upcoming.map(s => (
                    <ScheduleItem key={s.id} schedule={s} unitName={getUnitName(s.unitId)} />
                  ))
              }
            </CardBody>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card>
            <CardHeader title={t('nav.calendar')} />
            <CardBody>
              <CalendarView schedules={schedules} />
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

function AdminDashboardContent() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { schedules } = useSchedules({})
  const { getUnitName } = useUnits()
  const { setting: rangeSetting, range, save: saveRange } = useScheduleDateRange(user.uid)

  const thisMonth = schedules.filter(
    s => s.status === 'confirmed' && dayjs(s.date).format('YYYY-M') === dayjs().format('YYYY-M')
  )
  const upcoming = schedules
    .filter(s => s.status === 'confirmed' && s.date >= range.start && s.date <= range.end)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext={t('admin.dashboard')} />}
    >
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <ScheduleDateRangeFilter setting={rangeSetting} currentRange={range} onChange={saveRange} />
          <Card>
            <CardHeader
              title={t('schedule.upcoming')}
              action={<span style={{ fontSize: '0.8125rem', color: '#808081' }}>{t('schedule.thisMonth', { count: thisMonth.length })}</span>}
            />
            <CardBody>
              {upcoming.length === 0
                ? <p className={styles.empty}>{t('schedule.noUpcoming')}</p>
                : upcoming.map(s => (
                    <ScheduleItem key={s.id} schedule={s} unitName={getUnitName(s.unitId)} />
                  ))
              }
            </CardBody>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card>
            <CardHeader title={t('nav.calendar')} />
            <CardBody>
              <CalendarView schedules={schedules} />
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export function DashboardPage() {
  const user = useAtomValue(authUserAtom)!
  if (user.role === 'seventy') return <SeventyDashboard />
  if (user.role === 'admin') return <AdminDashboardContent />
  return <PresidentDashboard />
}
