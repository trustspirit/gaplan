import { useId, useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useTasks } from '@/hooks/useTasks'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { useTaskConfirm } from '@/hooks/useTaskConfirm'
import { useWardSubmit } from '@/hooks/useWardSubmit'
import { useTopBar } from '@/hooks/useTopBar'
import { EmptyState, LoadingState, ResponsiveDialog } from '@/components/ui'
import { TaskCard } from '@/components/domain/TaskCard/TaskCard'
import { TaskPickerContent } from '@/components/domain/TaskPickerContent/TaskPickerContent'
import { taskPickerTitle } from '@/components/domain/TaskPickerContent/taskPickerTitle'
import { selectGlanceSchedules } from '@/utils/glance'
import { ScheduleListCard } from './ScheduleListCard'
import { PrimaryTaskCard } from './PrimaryTaskCard'
import { splitHomeTasks } from './homeTasks'
import styles from './HomePage.module.scss'

/**
 * 회장 홈. 스펙 §4.6 — 지금 해야 할 일 하나(주 카드), 나머지는 접힘,
 * 그 아래 다가오는 일정. 판정 R38·R41이 여기 산다.
 */
export function PresidentHome() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { tasks, loading: tasksLoading } = useTasks(user.uid)
  const { primary, rest } = splitHomeTasks(tasks)

  // 사이드바 배지와 같은 기준 — 아직 답하지 않은 것만 센다.
  const pendingCount = tasks.filter((task) => task.status === 'pending').length
  useTopBar({
    subtext: dayjs().format(t('calendar.monthTitleFormat')),
    pendingCount,
    helpInfoKey: 'pageHelp.dashboardPresident',
  })

  const { schedules, loading: schedulesLoading } = useSchedules({ presidentUid: user.uid })
  const { getUnitName } = useUnits()
  const [restOpen, setRestOpen] = useState(false)
  const restRegionId = useId()

  const {
    activeTask,
    selectedSlots,
    toggleSlot,
    isSlotSelected,
    submitting,
    availableSlots,
    openTask,
    closeTask,
    handleSubmitAvailability,
  } = useTaskConfirm(user.uid, user.unitId)
  const { handleSubmitWards, wardSubmitting } = useWardSubmit(activeTask, closeTask)

  const today = dayjs().format('YYYY-MM-DD')
  const upcoming = selectGlanceSchedules(schedules, today)

  return (
    <>
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          {tasksLoading ? (
            <LoadingState shape="card" rows={1} />
          ) : primary ? (
            <PrimaryTaskCard task={primary} onAction={openTask} />
          ) : (
            <EmptyState title={t('home.allClear')} description={t('home.allClearDesc')} />
          )}

          {!tasksLoading && rest.length > 0 && (
            <div className={styles.restBlock}>
              <button
                type="button"
                className={styles.restToggle}
                aria-expanded={restOpen}
                aria-controls={restRegionId}
                onClick={() => setRestOpen((v) => !v)}
              >
                {restOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {restOpen ? t('home.moreTasksClose') : t('home.moreTasks', { count: rest.length })}
              </button>
              {restOpen && (
                <div id={restRegionId} className={styles.restList}>
                  {rest.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      // 답한 뒤에도 방문 Task는 와드별 날짜를 고쳐 낼 수 있다.
                      // 접견 Task는 다시 열지 않는다 — 한 번 잡힌 시간은 고정이다.
                      onAction={
                        task.status !== 'responded' || task.type === 'select_visit'
                          ? openTask
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <ScheduleListCard
            schedules={upcoming}
            loading={schedulesLoading}
            getUnitName={getUnitName}
            showCalendarAdd
          />
        </div>
      </div>

      <ResponsiveDialog open={!!activeTask} onClose={closeTask} title={taskPickerTitle(activeTask)}>
        {activeTask && (
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
        )}
      </ResponsiveDialog>
    </>
  )
}
