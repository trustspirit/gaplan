import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { submitWardAssignments } from '@/services/taskService'
import type { Task } from '@/types'

export function useWardSubmit(activeTask: Task | null, onDone: () => void) {
  const { t } = useTranslation()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitWards = async (assignments: { wardName: string; date: string }[]) => {
    if (!activeTask) return
    setSubmitting(true)
    try {
      const result = await submitWardAssignments({ taskId: activeTask.id, wardAssignments: assignments })
      if (result.success) {
        toast.success(t('ward.assignmentSubmitted'))
        onDone()
      } else {
        toast.error(result.error ?? t('ward.assignmentFailed'))
      }
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string; details?: string }
      const msg = err?.details ?? err?.message ?? err?.code ?? t('common.unknownError')
      console.error('[submitWardAssignments]', e)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return { handleSubmitWards, wardSubmitting: submitting }
}
