import { useEffect, useState } from 'react'
import type { HttpsCallable } from 'firebase/functions'
import { publicCallable } from '@/services/publicFunctions'
import type { TaskType } from '@/types/task'

export interface PublicTaskInfo {
  taskId: string
  title: string
  note: string
  type: TaskType
  status: string
  dueDate: string
  availableDates: string[]
  availableDateSlots: Array<{
    date: string
    timeRanges: Array<{ startTime: string; endTime: string }>
  }>
  slotDurationMinutes: number
  unitId: string
  assignedTo: string
  respondedSlots: Array<{ date: string; startTime: string; endTime: string }>
  wardAssignments: Array<{ wardName: string; date: string }>
}

// 'invalid-link' | 'load-failed' are sentinel codes the page translates;
// any other string is a raw server message shown as-is.
export type PublicTaskError = 'invalid-link' | 'load-failed' | string

interface UsePublicTaskResult {
  task: PublicTaskInfo | null
  loading: boolean
  error: PublicTaskError | null
  retry: () => void
}

let getPublicTaskInfoFn: HttpsCallable<
  { taskId: string; token: string },
  PublicTaskInfo
> | null = null

function getPublicTaskInfoCallable() {
  if (!getPublicTaskInfoFn) {
    getPublicTaskInfoFn = publicCallable<
      { taskId: string; token: string },
      PublicTaskInfo
    >('getPublicTaskInfo')
  }
  return getPublicTaskInfoFn
}

export function usePublicTask(
  taskId: string | undefined,
  token: string | null,
): UsePublicTaskResult {
  const [task, setTask] = useState<PublicTaskInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PublicTaskError | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!taskId || !token) {
      setError('invalid-link')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    getPublicTaskInfoCallable()({ taskId, token })
      .then((res) => setTask(res.data))
      .catch((err) => setError(err.message ?? 'load-failed'))
      .finally(() => setLoading(false))
  }, [taskId, token, reloadKey])

  return { task, loading, error, retry: () => setReloadKey(k => k + 1) }
}
