import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { Calendar, CheckCircle2 } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { useTasks } from '@/hooks/useTasks'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { useTaskConfirm } from '@/hooks/useTaskConfirm'
import { useIsMobile } from '@/hooks/useIsMobile'
import { subscribeToSharedCalendar } from '@/services/calendarService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Skeleton, Button, Modal, BottomSheet } from '@/components/ui'
import { TaskCard, ScheduleItem, CalendarView, TaskPickerContent, taskPickerTitle } from '@/components/domain'
import { useWardSubmit } from '@/hooks/useWardSubmit'
import { REGIONS } from '@/constants/regions'
import styles from './DashboardPage.module.scss'

function CalendarBanner({ connected }: { connected?: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      await subscribeToSharedCalendar()
      toast.success('구글 캘린더에 구독되었습니다!')
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
        구글 캘린더 구독으로 모든 확정 일정을 핸드폰에서 바로 확인하세요.
      </span>
      {connected ? (
        <div className={styles.calendarConnected}>
          <CheckCircle2 size={14} />
          구독 완료
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={handleConnect} loading={loading}>
          구독
        </Button>
      )}
    </div>
  )
}

function PresidentDashboard() {
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
            <CardHeader title="처리 필요" />
            <CardBody>
              {tasksLoading
                ? [1, 2].map(i => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
                : tasks.length === 0
                  ? <p className={styles.empty}>처리할 항목이 없습니다.</p>
                  : tasks.map(t => <TaskCard key={t.id} task={t} onAction={openTask} />)
              }
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="예정 일정" />
            <CardBody>
              {schedulesLoading
                ? [1, 2].map(i => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
                : upcoming.length === 0
                  ? <p className={styles.empty}>예정된 일정이 없습니다.</p>
                  : upcoming.map(s => (
                      <ScheduleItem key={s.id} schedule={s} unitName={getUnitName(s.unitId)} showCalendarAdd />
                    ))
              }
            </CardBody>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card>
            <CardHeader title="캘린더" />
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
              title="예정 일정"
              action={<span style={{ fontSize: '0.8125rem', color: '#808081' }}>이번 달 {thisMonthCount}건</span>}
            />
            <CardBody>
              {upcoming.length === 0
                ? <p className={styles.empty}>예정된 확정 일정이 없습니다.</p>
                : upcoming.map(s => (
                    <ScheduleItem key={s.id} schedule={s} unitName={getUnitName(s.unitId)} />
                  ))
              }
            </CardBody>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card>
            <CardHeader title="캘린더" />
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
  const user = useAtomValue(authUserAtom)!
  const { schedules } = useSchedules({})

  const thisMonth = schedules.filter(
    s => s.status === 'confirmed' && dayjs(s.date).format('YYYY-M') === dayjs().format('YYYY-M')
  )
  const upcoming = schedules
    .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)
  const { getUnitName } = useUnits()

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext="관리자 대시보드" />}
    >
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <Card>
            <CardHeader
              title="전체 예정 일정"
              action={<span style={{ fontSize: '0.8125rem', color: '#808081' }}>이번 달 {thisMonth.length}건</span>}
            />
            <CardBody>
              {upcoming.length === 0
                ? <p className={styles.empty}>예정된 일정이 없습니다.</p>
                : upcoming.map(s => (
                    <ScheduleItem key={s.id} schedule={s} unitName={getUnitName(s.unitId)} />
                  ))
              }
            </CardBody>
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card>
            <CardHeader title="캘린더" />
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
