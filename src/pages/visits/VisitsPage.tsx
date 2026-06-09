import { MapPin } from 'lucide-react'
import { ScheduleTypePage } from '@/pages/schedules/ScheduleTypePage'

export function VisitsPage() {
  return (
    <ScheduleTypePage
      translationPrefix="visits"
      scheduleType="ward_visit"
      EmptyIcon={MapPin}
      taskPath="/admin/visit-planner"
      sideTitleKey="visits.nextVisits"
      showWardInUpcoming
    />
  )
}
