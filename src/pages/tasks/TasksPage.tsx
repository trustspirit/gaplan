import { useAtomValue } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { useTasks } from '@/hooks/useTasks'
import { useTaskConfirm } from '@/hooks/useTaskConfirm'
import { useIsMobile } from '@/hooks/useIsMobile'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, Modal, BottomSheet, Skeleton } from '@/components/ui'
import { TaskCard, TimeSlotPicker } from '@/components/domain'
import styles from './TasksPage.module.scss'

export function TasksPage() {
  const user = useAtomValue(authUserAtom)!
  const { tasks, loading: tasksLoading } = useTasks(user.uid)
  const isMobile = useIsMobile()
  const {
    activeTask, selectedSlot, setSelectedSlot,
    submitting, slotsLoading, availableSlots,
    openTask, closeTask, handleConfirm,
  } = useTaskConfirm(user.uid, user.unitId)

  const slotPickerContent = (
    <>
      {slotsLoading
        ? <Skeleton height="120px" />
        : <TimeSlotPicker slots={availableSlots} selected={selectedSlot} onSelect={setSelectedSlot} />
      }
      <Button
        onClick={handleConfirm}
        loading={submitting}
        disabled={!selectedSlot || slotsLoading}
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
      topBar={<TopBar name={user.name} pendingCount={tasks.length} />}
    >
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <Card>
            <CardHeader title="처리 필요 Task" />
            <CardBody>
              {tasksLoading
                ? [1,2].map(i => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
                : tasks.length === 0
                  ? <p className={styles.empty}>모든 task가 완료되었습니다.</p>
                  : tasks.map(t => <TaskCard key={t.id} task={t} onAction={openTask} />)
              }
            </CardBody>
          </Card>
        </div>

        {!isMobile && (
          <div className={styles.sideCol}>
            {activeTask ? (
              <div className={styles.sidePickerCard}>
                <div className={styles.sidePickerHeader}>날짜/시간 선택</div>
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
        <BottomSheet open={!!activeTask} onClose={closeTask} title="날짜/시간 선택">
          {slotPickerContent}
        </BottomSheet>
      )}
    </AppShell>
  )
}
