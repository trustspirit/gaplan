import { useAtomValue, useSetAtom } from 'jotai'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { taskModalOpenAtom, selectedTaskAtom } from '@/store/uiAtom'
import { useTasks } from '@/hooks/useTasks'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { AppShell, Sidebar, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Skeleton } from '@/components/ui'
import { TaskCard, ScheduleItem, CalendarView } from '@/components/domain'
import type { Task } from '@/types'
import styles from './DashboardPage.module.scss'

function PresidentDashboard() {
  const user = useAtomValue(authUserAtom)!
  const setTaskModal = useSetAtom(taskModalOpenAtom)
  const setSelectedTask = useSetAtom(selectedTaskAtom)
  const { tasks, loading: tasksLoading } = useTasks(user.uid)
  const { schedules, loading: schedulesLoading } = useSchedules({ presidentUid: user.uid })
  const { getUnitName } = useUnits()

  const upcoming = schedules
    .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
    .slice(0, 3)

  const handleTaskAction = (task: Task) => {
    setSelectedTask(task)
    setTaskModal(true)
  }

  return (
    <AppShell
      sidebar={<Sidebar role={user.role} name={user.name} />}
      topBar={<TopBar name={user.name} subtext={dayjs().format('YYYY년 M월')} pendingCount={tasks.length} />}
    >
      <div className={styles.grid}>
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
    </AppShell>
  )
}

function SeventyDashboard() {
  const user = useAtomValue(authUserAtom)!
  const { schedules } = useSchedules({ seventyUid: user.uid })
  const { getUnitName } = useUnits()
  const thisMonth = schedules.filter(
    s => s.status === 'confirmed' && dayjs(s.date).month() === dayjs().month()
  )
  return (
    <AppShell
      sidebar={<Sidebar role={user.role} name={user.name} />}
      topBar={<TopBar name={user.name} subtext={user.regionId} />}
    >
      <div className={styles.grid}>
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
      sidebar={<Sidebar role={user.role} name={user.name} />}
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
