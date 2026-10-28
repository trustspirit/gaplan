import { useEffect, useState } from 'react'
import { subscribeToTasks, subscribeToAllTasks } from '@/services/taskService'
import type { Task } from '@/types'

export function useTasks(assignedTo: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assignedTo) {
      setLoading(false)
      return
    }
    const unsub = subscribeToTasks(
      assignedTo,
      data => {
        setTasks(data)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [assignedTo])

  return { tasks, loading }
}

// seventyUid: pass the seventy's UID to restrict to their tasks only
export function useAllTasks(seventyUid?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 규칙에 막히면 스냅샷 없이 오류만 온다 — 그때도 로딩은 끝내야 스피너가 멈춘다.
    const unsub = subscribeToAllTasks(
      data => {
        setTasks(data)
        setLoading(false)
      },
      seventyUid,
      () => setLoading(false),
    )
    return unsub
  }, [seventyUid])

  return { tasks, loading }
}
