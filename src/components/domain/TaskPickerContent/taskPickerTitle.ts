import i18n from '@/i18n'
import type { Task } from '@/types'

/** Returns the picker panel title for a given active task (language-aware). */
export function taskPickerTitle(task: Task | null): string {
  if (!task) return ''
  if (task.type === 'select_visit') return task.title ?? i18n.t('ward.assignTitle')
  return i18n.t('schedule.selectTimeSlots')
}
