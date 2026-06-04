/**
 * TaskPickerContent — shared between DashboardPage and TasksPage.
 *
 * Renders the appropriate UI for a given active task:
 *  - select_visit     → WardAssigner (assign wards to available Sundays)
 *  - select_interview → TimeSlotPicker (multi-select available time slots)
 */
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { Button } from '@/components/ui'
import { TimeSlotPicker, WardAssigner } from '@/components/domain'
import { getWardsByUnit } from '@/constants/regions'
import type { Task, TimeSlot, AppUser } from '@/types'
import styles from './TaskPickerContent.module.scss'

interface TaskPickerContentProps {
  activeTask: Task
  user: Pick<AppUser, 'unitId'>
  availableSlots: TimeSlot[]
  isSlotSelected: (slot: TimeSlot) => boolean
  onToggleSlot: (slot: TimeSlot) => void
  slotSubmitting: boolean
  selectedSlots: TimeSlot[]
  onSubmitAvailability: () => Promise<void>
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
  const { t } = useTranslation()
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
        {selectedSlots.length > 0
          ? t('schedule.submitAvailability', { count: selectedSlots.length })
          : t('schedule.submitAvailabilityEmpty')}
      </Button>
    </>
  )
}

/** Returns the picker panel title for a given active task (language-aware). */
export function taskPickerTitle(task: Task | null): string {
  if (!task) return ''
  if (task.type === 'select_visit') return task.title ?? i18n.t('ward.assignTitle')
  return i18n.t('schedule.selectTimeSlots')
}
