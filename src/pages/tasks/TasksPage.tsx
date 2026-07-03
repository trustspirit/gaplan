import { useAtomValue } from 'jotai'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useTasks } from '@/hooks/useTasks'
import { useTaskConfirm } from '@/hooks/useTaskConfirm'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useWardSubmit } from '@/hooks/useWardSubmit'
import { useTopBar } from '@/hooks/useTopBar'
import { Card, CardHeader, CardBody, BottomSheet, Skeleton } from '@/components/ui'
import { TaskCard } from '@/components/domain/TaskCard/TaskCard'
import { TaskPickerContent } from '@/components/domain/TaskPickerContent/TaskPickerContent'
import { taskPickerTitle } from '@/components/domain/TaskPickerContent/taskPickerTitle'
import styles from './TasksPage.module.scss'

export function TasksPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { tasks, loading: tasksLoading } = useTasks(user.uid)
  const isMobile = useIsMobile()

  const {
    activeTask,
    selectedSlots,
    toggleSlot,
    isSlotSelected,
    submitting: slotSubmitting,
    availableSlots,
    isVisit,
    openTask,
    closeTask,
    handleSubmitAvailability,
  } = useTaskConfirm(user.uid, user.unitId)

  const { handleSubmitWards, wardSubmitting } = useWardSubmit(activeTask, closeTask)

  const pendingTasks = tasks.filter((t) => t.status === 'pending')
  useTopBar({ pendingCount: pendingTasks.length, helpInfoKey: 'pageHelp.tasks' })
  const respondedTasks = tasks.filter((t) => t.status === 'responded')
  const pickerTitle = taskPickerTitle(activeTask)

  const pickerContent = activeTask ? (
    <TaskPickerContent
      activeTask={activeTask}
      user={user}
      availableSlots={availableSlots}
      isSlotSelected={isSlotSelected}
      onToggleSlot={toggleSlot}
      slotSubmitting={slotSubmitting}
      selectedSlots={selectedSlots}
      onSubmitAvailability={handleSubmitAvailability}
      onSubmitWards={handleSubmitWards}
      wardSubmitting={wardSubmitting}
    />
  ) : null

  return (
    <>
      <div className={styles.layout}>
        {/* ── Main column ── */}
        <div className={styles.mainCol}>
          <Card>
            <CardHeader title={t('task.needsAction')} />
            <CardBody>
              {tasksLoading ? (
                [1, 2].map((i) => (
                  <Skeleton key={i} height="44px" className={styles.skeletonItem} />
                ))
              ) : pendingTasks.length === 0 ? (
                <p className={styles.empty}>{t('task.noTasks')}</p>
              ) : (
                pendingTasks.map((t) => <TaskCard key={t.id} task={t} onAction={openTask} />)
              )}
            </CardBody>
          </Card>

          {!tasksLoading && respondedTasks.length > 0 && (
            <Card>
              <CardHeader title={t('task.responded')} />
              <CardBody>
                {respondedTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onAction={t.type === 'select_visit' ? openTask : undefined}
                  />
                ))}
              </CardBody>
            </Card>
          )}

          {/* Ward visit: full-width inline card on PC (grid needs horizontal space) */}
          {!isMobile && isVisit && activeTask && (
            <Card>
              <CardHeader
                title={pickerTitle}
                action={
                  <button type="button" className={styles.closeBtn} onClick={closeTask}>
                    <X size={16} />
                  </button>
                }
              />
              <CardBody>{pickerContent}</CardBody>
            </Card>
          )}
        </div>

        {/* ── Side column: interview tasks on PC ── */}
        {!isMobile && !isVisit && (
          <div className={styles.sideCol}>
            {activeTask ? (
              <div className={styles.sidePickerCard}>
                <div className={styles.sidePickerHeader}>{pickerTitle}</div>
                <div className={styles.sidePickerBody}>{pickerContent}</div>
              </div>
            ) : (
              <div className={styles.sidePlaceholder}>{t('task.selectTask')}</div>
            )}
          </div>
        )}
      </div>

      {/* Mobile: both visit and interview in BottomSheet */}
      {isMobile && (
        <BottomSheet open={!!activeTask} onClose={closeTask} title={pickerTitle}>
          {pickerContent}
        </BottomSheet>
      )}
    </>
  )
}
