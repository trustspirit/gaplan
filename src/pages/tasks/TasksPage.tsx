import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { useTasks } from '@/hooks/useTasks'
import { useAvailability } from '@/hooks/useAvailability'
import { useSchedules } from '@/hooks/useSchedules'
import { useIsMobile } from '@/hooks/useIsMobile'
import { computeAvailableSlots } from '@/services/availabilityService'
import { confirmSchedule } from '@/services/scheduleService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button, Modal, BottomSheet } from '@/components/ui'
import { TaskCard, TimeSlotPicker } from '@/components/domain'
import type { Task, TimeSlot } from '@/types'
import styles from './TasksPage.module.scss'

export function TasksPage() {
  const user = useAtomValue(authUserAtom)!
  const { tasks } = useTasks(user.uid)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isMobile = useIsMobile()

  const { schedules } = useSchedules({ presidentUid: user.uid })

  const seventyUid = activeTask?.seventyUid ?? ''

  const { slots } = useAvailability(seventyUid)
  const confirmedDates = schedules.filter(s => s.status === 'confirmed').map(s => s.date)
  const availableSlots = computeAvailableSlots(
    slots,
    confirmedDates,
    dayjs().format('YYYY-MM-DD'),
    dayjs().add(60, 'day').format('YYYY-MM-DD'),
  )

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
      topBar={<TopBar name={user.name} pendingCount={tasks.length} />}
    >
      <div className={styles.page}>
        <Card>
          <CardHeader title="처리 필요 Task" />
          <CardBody>
            {tasks.length === 0
              ? <p className={styles.empty}>모든 task가 완료되었습니다.</p>
              : tasks.map(t => <TaskCard key={t.id} task={t} onAction={setActiveTask} />)
            }
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
