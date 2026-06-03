import { useAtomValue } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useIsMobile } from '@/hooks/useIsMobile'
import { AppShell, Sidebar, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody } from '@/components/ui'
import { CalendarView } from '@/components/domain'
import styles from './CalendarPage.module.scss'

export function CalendarPage() {
  const user = useAtomValue(authUserAtom)!
  const isMobile = useIsMobile()
  const filters = user.role === 'president' ? { presidentUid: user.uid } : user.role === 'seventy' ? { seventyUid: user.uid } : {}
  const { schedules } = useSchedules(filters)
  return (
    <AppShell sidebar={<Sidebar role={user.role} name={user.name} />} topBar={<TopBar name={user.name} subtext="캘린더" />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title="일정 캘린더" />
          <CardBody>
            <CalendarView schedules={schedules} defaultView={isMobile ? 'week' : 'month'} />
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
