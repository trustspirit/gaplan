import { Users } from 'lucide-react'
import { ScheduleTypePage } from '@/pages/schedules/ScheduleTypePage'

export function InterviewsPage() {
  return (
    <ScheduleTypePage
      translationPrefix="interviews"
      scheduleType="interview"
      EmptyIcon={Users}
      taskPath="/admin/tasks"
      sideTitleKey="interviews.nextInterviews"
    />
  )
}
