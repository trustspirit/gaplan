export const APP_URL = 'https://gaplan-fccfe.web.app'

export const TASK_TYPE_LABELS: Record<string, string> = {
  select_visit:     '와드 방문 일정',
  select_interview: '접견/모임 일정',
}

export function resolveTaskTypeLabel(type: string, title?: string): string {
  return title || TASK_TYPE_LABELS[type] || 'Task'
}
