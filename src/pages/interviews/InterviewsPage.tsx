import { useAtomValue } from 'jotai'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody } from '@/components/ui'
import { ScheduleItem } from '@/components/domain'
import styles from './InterviewsPage.module.scss'

export function InterviewsPage() {
  const user = useAtomValue(authUserAtom)!
  const filters = user.role === 'president'
    ? { presidentUid: user.uid }
    : user.role === 'seventy'
      ? { seventyUid: user.uid }
      : {}
  const { schedules } = useSchedules(filters)
  const { getUnitName } = useUnits()
  const interviews = schedules.filter(s => s.type === 'interview' && s.status === 'confirmed')
  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext="접견 일정" />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title="접견 일정" />
          <CardBody>
            {interviews.length === 0
              ? <p className={styles.empty}>확정된 접견 일정이 없습니다.</p>
              : interviews.map(s => <ScheduleItem key={s.id} schedule={s} unitName={getUnitName(s.unitId)} />)
            }
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
