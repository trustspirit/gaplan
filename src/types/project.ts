export type ProjectStatus = 'active' | 'done' | 'dropped'

export interface Project {
  id: string
  title: string
  notes?: string
  status: ProjectStatus
  createdBy: string
  createdAt: string
}
