import { useFirestoreSubscription } from './useFirestoreSubscription'
import { subscribeToProjects } from '@/services/projectService'
import type { Project } from '@/types'

export function useProjects() {
  const { data: projects, loading } = useFirestoreSubscription<Project>(subscribeToProjects)
  return { projects, loading }
}
