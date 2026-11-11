import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { computeInterviewSlots } from '@/services/availabilityService'
import { confirmSchedule } from '@/services/scheduleService'
import { submitAvailability } from '@/services/taskService'
import type { Task, TimeSlot } from '@/types'

export function useTaskConfirm(presidentUid: string, unitId: string | undefined) {
  const { t } = useTranslation()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([])
  const [submitting, setSubmitting] = useState(false)

  const isVisit = activeTask?.type === 'select_visit'
  const isMultiSelect = activeTask?.type === 'select_interview'

  // Ward visits: WardAssigner uses availableDates directly (no slot computation needed)
  const visitAvailableSlots: TimeSlot[] = []

  // Interview/Meeting: compute from per-date slots set by admin
  const interviewAvailableSlots = isMultiSelect && activeTask
    ? computeInterviewSlots(
        activeTask.availableDateSlots ?? [],
        activeTask.slotDurationMinutes ?? 60,
      )
    : []

  const availableSlots = isVisit ? visitAvailableSlots : interviewAvailableSlots

  const openTask = (task: Task) => {
    setActiveTask(task)
    setSelectedSlot(null)
    setSelectedSlots([])
  }

  const closeTask = () => {
    setActiveTask(null)
    setSelectedSlot(null)
    setSelectedSlots([])
  }

  const toggleSlot = (slot: TimeSlot) => {
    const key = `${slot.date}-${slot.startTime}`
    setSelectedSlots(prev => {
      const exists = prev.some(s => `${s.date}-${s.startTime}` === key)
      return exists ? prev.filter(s => `${s.date}-${s.startTime}` !== key) : [...prev, slot]
    })
  }

  const isSlotSelected = (slot: TimeSlot) =>
    selectedSlots.some(s => s.date === slot.date && s.startTime === slot.startTime)

  const handleConfirm = async () => {
    if (!activeTask || !selectedSlot || !unitId) return
    setSubmitting(true)
    try {
      const result = await confirmSchedule({
        taskId: activeTask.id,
        seventyUid: activeTask.seventyUid,
        unitId,
        slot: selectedSlot,
        type: 'ward_visit',
      })
      if (result.success) {
        toast.success(t('schedule.visitConfirmed'))
        closeTask()
      } else {
        toast.error(result.error ?? t('schedule.dateTaken'))
      }
    } catch {
      toast.error(t('common.errorRetry'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitAvailability = async () => {
    if (!activeTask || selectedSlots.length === 0) return
    setSubmitting(true)
    try {
      const result = await submitAvailability({
        taskId: activeTask.id,
        slots: selectedSlots.map(s => ({ date: s.date, startTime: s.startTime, endTime: s.endTime })),
      })
      if (result.success) {
        toast.success(t('schedule.availabilitySubmitted'))
        closeTask()
      } else {
        toast.error(result.error ?? t('common.submitFailed'))
      }
    } catch {
      toast.error(t('common.errorRetry'))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    activeTask,
    selectedSlot,
    setSelectedSlot,
    selectedSlots,
    toggleSlot,
    isSlotSelected,
    submitting,
    slotsLoading: false,
    availableSlots,
    isVisit,
    isMultiSelect,
    openTask,
    closeTask,
    handleConfirm,
    handleSubmitAvailability,
  }
}
