/**
 * TaskPickerContent — shared between DashboardPage and TasksPage.
 *
 * Renders the appropriate UI for a given active task:
 *  - select_visit     → WardAssigner (assign wards to available Sundays)
 *  - select_interview → TimeSlotPicker (multi-select available time slots)
 */
import { Button } from '@/components/ui'
import { TimeSlotPicker, WardAssigner } from '@/components/domain'
import { getWardsByUnit } from '@/constants/regions'
import type { Task, TimeSlot, AppUser } from '@/types'
import styles from './TaskPickerContent.module.scss'

interface TaskPickerContentProps {
  activeTask: Task
  user: Pick<AppUser, 'unitId'>
  // Interview/meeting slots
  availableSlots: TimeSlot[]
  isSlotSelected: (slot: TimeSlot) => boolean
  onToggleSlot: (slot: TimeSlot) => void
  slotSubmitting: boolean
  selectedSlots: TimeSlot[]
  onSubmitAvailability: () => Promise<void>
  // Ward visit
  onSubmitWards: (assignments: { wardName: string; date: string }[]) => Promise<void>
  wardSubmitting: boolean
}

export function TaskPickerContent({
  activeTask,
  user,
  availableSlots,
  isSlotSelected,
  onToggleSlot,
  slotSubmitting,
  selectedSlots,
  onSubmitAvailability,
  onSubmitWards,
  wardSubmitting,
}: TaskPickerContentProps) {
  const isVisit = activeTask.type === 'select_visit'

  if (isVisit) {
    const wards = getWardsByUnit(user.unitId ?? '')
    return (
      <WardAssigner
        availableDates={activeTask.availableDates ?? []}
        wards={wards}
        note={activeTask.note}
        initialAssignments={activeTask.wardAssignments}
        onSubmit={onSubmitWards}
        submitting={wardSubmitting}
      />
    )
  }

  return (
    <>
      <TimeSlotPicker
        slots={availableSlots}
        granularity="time"
        multiSelect
        isSlotSelected={isSlotSelected}
        onToggle={onToggleSlot}
      />
      <Button
        onClick={onSubmitAvailability}
        loading={slotSubmitting}
        disabled={selectedSlots.length === 0}
        fullWidth
        className={styles.submitBtn}
      >
        가능 시간 제출 {selectedSlots.length > 0 ? `(${selectedSlots.length}개)` : ''}
      </Button>
    </>
  )
}

export function taskPickerTitle(task: Task | null): string {
  if (!task) return ''
  if (task.type === 'select_visit') return task.title ?? '와드/지부 방문 날짜 배정'
  return '가능한 시간 선택 (복수 가능)'
}
