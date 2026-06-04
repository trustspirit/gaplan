import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { useTasks } from '@/hooks/useTasks'
import { useTaskConfirm } from '@/hooks/useTaskConfirm'
import { useIsMobile } from '@/hooks/useIsMobile'
import { submitWardAssignments } from '@/services/taskService'
import { getWardsByUnit } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, BottomSheet, Skeleton } from '@/components/ui'
import { TaskCard, TimeSlotPicker, WardAssigner } from '@/components/domain'
import type { Task } from '@/types'
import styles from './TasksPage.module.scss'

function useWardSubmit(activeTask: Task | null, onDone: () => void) {
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitWards = async (assignments: { wardName: string; date: string }[]) => {
    if (!activeTask) return
    setSubmitting(true)
    try {
      const result = await submitWardAssignments({ taskId: activeTask.id, wardAssignments: assignments })
      if (result.success) {
        toast.success('와드 방문 배정이 제출되었습니다!')
        onDone()
      } else {
        toast.error(result.error ?? '제출에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return { handleSubmitWards, submitting }
}

export function TasksPage() {
  const user = useAtomValue(authUserAtom)!
  const { tasks, loading: tasksLoading } = useTasks(user.uid)
  const isMobile = useIsMobile()
  const {
    activeTask, selectedSlot, setSelectedSlot,
    selectedSlots, toggleSlot, isSlotSelected,
    submitting: slotSubmitting, availableSlots, isVisit, isMultiSelect,
    openTask, closeTask, handleConfirm, handleSubmitAvailability,
  } = useTaskConfirm(user.uid, user.unitId)

  const { handleSubmitWards, submitting: wardSubmitting } = useWardSubmit(activeTask, closeTask)

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const respondedTasks = tasks.filter(t => t.status === 'responded')

  // For ward visits: show WardAssigner; for interview/meeting: show TimeSlotPicker
  const availableWards = isVisit && activeTask
    ? getWardsByUnit(user.unitId ?? '')
    : []

  const wardPickerContent = isVisit && activeTask ? (
    <WardAssigner
      availableDates={activeTask.availableDates ?? []}
      wards={availableWards}
      onSubmit={handleSubmitWards}
      submitting={wardSubmitting}
    />
  ) : null

  const slotPickerContent = (
    <>
      <TimeSlotPicker
        slots={availableSlots}
        granularity="time"
        multiSelect
        isSlotSelected={isSlotSelected}
        onToggle={toggleSlot}
      />
      <Button
        onClick={handleSubmitAvailability}
        loading={slotSubmitting}
        disabled={selectedSlots.length === 0}
        fullWidth
        className={styles.confirmBtn}
      >
        가능 시간 제출 {selectedSlots.length > 0 ? `(${selectedSlots.length}개)` : ''}
      </Button>
    </>
  )

  const pickerTitle = isVisit ? '와드/지부 방문 날짜 배정' : '가능한 시간 선택 (복수 가능)'
  const activeContent = isVisit ? wardPickerContent : slotPickerContent

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
                <div className={styles.sidePickerHeader}>{pickerTitle}</div>
                <div className={styles.sidePickerBody}>{activeContent}</div>
              </div>
            ) : (
              <div className={styles.sidePlaceholder}>
                Task를 선택하면 여기서 처리할 수 있습니다
              </div>
            )}
          </div>
        )}
      </div>

      {isMobile && (
        <BottomSheet open={!!activeTask} onClose={closeTask} title={pickerTitle}>
          {activeContent}
        </BottomSheet>
      )}
    </AppShell>
  )
}
