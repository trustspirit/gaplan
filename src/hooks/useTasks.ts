import { useEffect, useState } from 'react'
import { subscribeToTasks } from '@/services/taskService'
import type { Task } from '@/types'

export function useTasks(assignedTo: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assignedTo) {
      setLoading(false)
      return
    }
    const unsub = subscribeToTasks(assignedTo, data => {
      setTasks(data)
      setLoading(false)
    })
    return unsub
  }, [assignedTo])

  return { tasks, loading }
}
