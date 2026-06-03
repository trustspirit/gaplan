import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { useTasks } from '@/hooks/useTasks'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { useAvailability } from '@/hooks/useAvailability'
import { useIsMobile } from '@/hooks/useIsMobile'
import { computeAvailableSlots } from '@/services/availabilityService'
import { confirmSchedule } from '@/services/scheduleService'
import { subscribeToSharedCalendar } from '@/services/calendarService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Skeleton, Button, Modal, BottomSheet } from '@/components/ui'
import { TaskCard, ScheduleItem, CalendarView, TimeSlotPicker } from '@/components/domain'
import { REGIONS } from '@/constants/regions'
import type { Task, TimeSlot } from '@/types'
import styles from './DashboardPage.module.scss'

function CalendarConnectCard({ connected }: { connected?: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      await subscribeToSharedCalendar()
      toast.success('구글 캘린더에 구독되었습니다! 핸드폰 캘린더에도 자동으로 나타납니다.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '연동에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (connected) {
    return (
      <div className={styles.calendarConnected}>
        <Calendar size={14} />
        <span>구글 캘린더 구독 완료</span>
      </div>
    )
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleConnect} loading={loading}>
      <Calendar size={14} />
      구글 캘린더 구독
    </Button>
  )
}

function PresidentDashboard() {
  const user = useAtomValue(authUserAtom)!
  const { tasks, loading: tasksLoading } = useTasks(user.uid)
  const { schedules, loading: schedulesLoading } = useSchedules({ presidentUid: user.uid })
  const { getUnitName } = useUnits()
  const isMobile = useIsMobile()

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const seventyUid = activeTask?.seventyUid ?? ''
  const { slots } = useAvailability(seventyUid)
  const confirmedDates = schedules.filter(s => s.status === 'confirmed').map(s => s.date)
  const availableSlots = computeAvailableSlots(
    slots,
    confirmedDates,
    dayjs().format('YYYY-MM-DD'),
    dayjs().add(60, 'day').format('YYYY-MM-DD'),
  )

  const handleTaskAction = (task: Task) => {
    setActiveTask(task)
    setSelectedSlot(null)
  }

  const handleConfirm = async () => {
    if (!activeTask || !selectedSlot || !user.unitId) return
    setSubmitting(true)
    try {
      const result = await confirmSchedule({
        taskId: activeTask.id,
        seventyUid,
        unitId: user.unitId,
        slot: selectedSlot,
        type: activeTask.type === 'select_visit' ? 'ward_visit' : 'interview',
      })
      if (result.success) {
        toast.success('일정이 확정되었습니다!')
        setActiveTask(null)
        setSelectedSlot(null)
      } else {
        toast.error(result.error ?? '해당 슬롯이 이미 선택되었습니다. 다른 시간을 선택해주세요.')
      }
    } catch {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const upcoming = schedules
    .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
    .slice(0, 3)

  const slotPickerContent = (
    <>
      <TimeSlotPicker slots={availableSlots} selected={selectedSlot} onSelect={setSelectedSlot} />
      <Button
        onClick={handleConfirm}
        loading={submitting}
        disabled={!selectedSlot}
        fullWidth
        className={styles.confirmBtn}
      >
        일정 확정
      </Button>
    </>
  )

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext={dayjs().format('YYYY년 M월')} pendingCount={tasks.length} />}
    >
      <div className={styles.grid}>
        <Card className={styles.calendarConnectCard}>
          <CardHeader title="구글 캘린더" action={<CalendarConnectCard connected={user.calendarConnected} />} />
          <CardBody>
            <p className={styles.calendarDesc}>
              구독하면 모든 확정 일정이 핸드폰 및 Google 캘린더에 자동으로 나타납니다.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="처리 필요" />
          <CardBody>
            {tasksLoading
              ? [1,2].map(i => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
              : tasks.length === 0
                ? <p className={styles.empty}>처리할 항목이 없습니다.</p>
                : tasks.map(t => <TaskCard key={t.id} task={t} onAction={handleTaskAction} />)
            }
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="확정 일정" />
          <CardBody>
            {schedulesLoading
              ? [1,2].map(i => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
              : upcoming.length === 0
                ? <p className={styles.empty}>예정된 일정이 없습니다.</p>
                : upcoming.map(s => <ScheduleItem key={s.id} schedule={s} unitName={getUnitName(s.unitId)} />)
            }
          </CardBody>
        </Card>

        <Card className={styles.calendarCard}>
          <CardHeader title="캘린더" />
          <CardBody>
            <CalendarView schedules={schedules} />
          </CardBody>
        </Card>
      </div>

      {isMobile ? (
        <BottomSheet open={!!activeTask} onClose={() => setActiveTask(null)} title="날짜/시간 선택">
          {slotPickerContent}
        </BottomSheet>
      ) : (
        <Modal open={!!activeTask} onClose={() => setActiveTask(null)} title="날짜/시간 선택">
          {slotPickerContent}
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
  const thisMonth = schedules.filter(
    s => s.status === 'confirmed' && dayjs(s.date).month() === dayjs().month()
  )
  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext={regionName} />}
    >
      <div className={styles.grid}>
        <Card className={styles.calendarConnectCard}>
          <CardHeader title="구글 캘린더" action={<CalendarConnectCard connected={user.calendarConnected} />} />
          <CardBody>
            <p className={styles.calendarDesc}>
              구독하면 모든 확정 일정이 핸드폰 및 Google 캘린더에 자동으로 나타납니다.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="이번 달 일정" />
          <CardBody>
            {thisMonth.length === 0
              ? <p className={styles.empty}>이번 달 확정 일정이 없습니다.</p>
              : thisMonth.map(s => <ScheduleItem key={s.id} schedule={s} unitName={getUnitName(s.unitId)} />)
            }
          </CardBody>
        </Card>
        <Card className={styles.calendarCard}>
          <CardHeader title="캘린더" />
          <CardBody><CalendarView schedules={schedules} /></CardBody>
        </Card>
      </div>
    </AppShell>
  )
}

function AdminDashboardContent() {
  const user = useAtomValue(authUserAtom)!
  const { schedules } = useSchedules({})
  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} />}
    >
      <div className={styles.grid}>
        <Card className={styles.calendarCard}>
          <CardHeader title="전체 일정" />
          <CardBody><CalendarView schedules={schedules} /></CardBody>
        </Card>
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
