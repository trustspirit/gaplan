import { useEffect, useState } from 'react'
import { subscribeToProjects } from '@/services/projectService'
import type { Project } from '@/types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToProjects(
      data => { setProjects(data); setLoading(false) },
      () => setLoading(false),
    )
    return unsub
  }, [])

  return { projects, loading }
}
