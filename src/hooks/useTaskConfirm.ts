import { useState } from 'react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { useSchedules } from '@/hooks/useSchedules'
import { computeAvailableSlots } from '@/services/availabilityService'
import { confirmSchedule } from '@/services/scheduleService'
import type { Task, TimeSlot, AvailabilitySlot } from '@/types'

export function useTaskConfirm(presidentUid: string, unitId: string | undefined) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { schedules } = useSchedules({ presidentUid })
  const confirmedDates = schedules.filter(s => s.status === 'confirmed').map(s => s.date)

  // Build synthetic AvailabilitySlot[] from the task's own availability settings
  const taskSlots: AvailabilitySlot[] = activeTask
    ? (activeTask.availableDays ?? []).map(day => ({
        id: '',
        seventyUid: activeTask.seventyUid,
        type: 'recurring' as const,
        recurringDays: [day],
        startTime: activeTask.availableStartTime ?? '09:00',
        endTime: activeTask.availableEndTime ?? '18:00',
        isBlocked: false,
      }))
    : []

  const availableSlots = computeAvailableSlots(
    taskSlots,
    confirmedDates,
    dayjs().format('YYYY-MM-DD'),
    dayjs().add(60, 'day').format('YYYY-MM-DD'),
  )

  const isVisit = activeTask?.type === 'select_visit'

  const openTask = (task: Task) => {
    setActiveTask(task)
    setSelectedSlot(null)
  }

  const closeTask = () => {
    setActiveTask(null)
    setSelectedSlot(null)
  }

  const handleConfirm = async () => {
    if (!activeTask || !selectedSlot || !unitId) return
    setSubmitting(true)
    try {
      const result = await confirmSchedule({
        taskId: activeTask.id,
        seventyUid: activeTask.seventyUid,
        unitId,
        slot: selectedSlot,
        type: activeTask.type === 'select_visit' ? 'ward_visit' : 'interview',
      })
      if (result.success) {
        toast.success('일정이 확정되었습니다!')
        closeTask()
      } else {
        toast.error(result.error ?? '해당 슬롯이 이미 선택되었습니다. 다른 시간을 선택해주세요.')
      }
    } catch {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    activeTask,
    selectedSlot,
    setSelectedSlot,
    submitting,
    slotsLoading: false,   // computed synchronously from task data
    availableSlots,
    isVisit,
    openTask,
    closeTask,
    handleConfirm,
  }
}
