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

interface UsePublicTaskResult {
  task: PublicTaskInfo | null
  loading: boolean
  error: string | null
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taskId || !token) {
      setError('잘못된 링크입니다.')
      setLoading(false)
      return
    }

    getPublicTaskInfoCallable()({ taskId, token })
      .then((res) => setTask(res.data))
      .catch((err) => setError(err.message ?? '정보를 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [taskId, token])

  return { task, loading, error }
}
