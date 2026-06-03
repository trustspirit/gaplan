import { useAtomValue } from 'jotai'
import { Link } from 'react-router-dom'
import { authUserAtom } from '@/store/authAtom'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import styles from './AdminDashboard.module.scss'

export function AdminDashboard() {
  const user = useAtomValue(authUserAtom)!
  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext="관리자 대시보드" />}
    >
      <div className={styles.page}>
        <Card>
          <CardHeader title="관리 메뉴" />
          <CardBody>
            <div className={styles.menu}>
              <Link to="/admin/users"><Button variant="secondary" fullWidth>사용자 관리</Button></Link>
              <Link to="/admin/tasks"><Button variant="secondary" fullWidth>Task 생성</Button></Link>
              <Link to="/admin/availability"><Button variant="secondary" fullWidth>가능 일정 설정</Button></Link>
              <Link to="/admin/calendar"><Button variant="secondary" fullWidth>구글 캘린더 연동</Button></Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
