import { useAtomValue } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { useTasks } from '@/hooks/useTasks'
import { useTaskConfirm } from '@/hooks/useTaskConfirm'
import { useIsMobile } from '@/hooks/useIsMobile'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, BottomSheet, Skeleton } from '@/components/ui'
import { TaskCard, TimeSlotPicker, VisitDatePicker } from '@/components/domain'
import styles from './TasksPage.module.scss'

export function TasksPage() {
  const user = useAtomValue(authUserAtom)!
  const { tasks, loading: tasksLoading } = useTasks(user.uid)
  const isMobile = useIsMobile()
  const {
    activeTask, selectedSlot, setSelectedSlot,
    selectedSlots, toggleSlot, isSlotSelected,
    submitting, availableSlots, isVisit, isMultiSelect,
    openTask, closeTask, handleConfirm, handleSubmitAvailability,
  } = useTaskConfirm(user.uid, user.unitId)

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const respondedTasks = tasks.filter(t => t.status === 'responded')

  const slotPickerContent = (
    <>
      {isVisit ? (
        <VisitDatePicker
          slots={availableSlots}
          selected={selectedSlot}
          onSelect={setSelectedSlot}
        />
      ) : (
        <TimeSlotPicker
          slots={availableSlots}
          granularity="time"
          multiSelect
          isSlotSelected={isSlotSelected}
          onToggle={toggleSlot}
        />
      )}
      {isMultiSelect ? (
        <Button
          onClick={handleSubmitAvailability}
          loading={submitting}
          disabled={selectedSlots.length === 0}
          fullWidth
          className={styles.confirmBtn}
        >
          가능 시간 제출 {selectedSlots.length > 0 ? `(${selectedSlots.length}개)` : ''}
        </Button>
      ) : (
        <Button
          onClick={handleConfirm}
          loading={submitting}
          disabled={!selectedSlot}
          fullWidth
          className={styles.confirmBtn}
        >
          방문 일정 확정
        </Button>
      )}
    </>
  )

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} pendingCount={pendingTasks.length} />}
    >
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <Card>
            <CardHeader title="처리 필요" />
            <CardBody>
              {tasksLoading
                ? [1, 2].map(i => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
                : pendingTasks.length === 0
                  ? <p className={styles.empty}>처리할 항목이 없습니다.</p>
                  : pendingTasks.map(t => <TaskCard key={t.id} task={t} onAction={openTask} />)
              }
            </CardBody>
          </Card>

          {!tasksLoading && respondedTasks.length > 0 && (
            <Card>
              <CardHeader title="제출 완료 · 확정 대기" />
              <CardBody>
                {respondedTasks.map(t => <TaskCard key={t.id} task={t} />)}
              </CardBody>
            </Card>
          )}
        </div>

        {!isMobile && (
          <div className={styles.sideCol}>
            {activeTask ? (
              <div className={styles.sidePickerCard}>
                <div className={styles.sidePickerHeader}>
                  {isVisit
                    ? '방문 날짜 선택'
                    : '가능한 시간 선택 (복수 가능)'}
                </div>
                <div className={styles.sidePickerBody}>
                  {slotPickerContent}
                </div>
              </div>
            ) : (
              <div className={styles.sidePlaceholder}>
                Task를 선택하면 여기서 일정을 확정할 수 있습니다
              </div>
            )}
          </div>
        )}
      </div>

      {isMobile && (
        <BottomSheet
          open={!!activeTask}
          onClose={closeTask}
          title={isVisit ? '방문 날짜 선택' : '가능한 시간 선택 (복수 가능)'}
        >
          {slotPickerContent}
        </BottomSheet>
      )}
    </AppShell>
  )
}
