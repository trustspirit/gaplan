import { useAtomValue } from 'jotai'
import { Link } from 'react-router-dom'
import { Users, ListChecks, CalendarCheck, MapPin } from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui'
import styles from './AdminDashboard.module.scss'

const ACTION_CARDS = [
  {
    icon: Users,
    title: '사용자 관리',
    desc: '초대 및 역할 관리',
    link: '/admin/users',
  },
  {
    icon: ListChecks,
    title: 'Task 생성',
    desc: '스테이크/지방부 회장에게 Task 할당',
    link: '/admin/tasks',
  },
  {
    icon: MapPin,
    title: '방문 일정 계획',
    desc: '와드/지부별 방문 일요일 배정',
    link: '/admin/visit-planner',
  },
  {
    icon: CalendarCheck,
    title: '구글 캘린더',
    desc: '공유 캘린더 연동 설정',
    link: '/admin/calendar',
  },
] as const

export function AdminDashboard() {
  const user = useAtomValue(authUserAtom)!
  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext="관리자 대시보드" />}
    >
      <div className={styles.page}>
        <div className={styles.cardGrid}>
          {ACTION_CARDS.map(({ icon: Icon, title, desc, link }) => (
            <div key={link} className={styles.actionCard}>
              <div className={styles.cardIcon}>
                <Icon size={28} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{title}</h3>
                <p className={styles.cardDesc}>{desc}</p>
              </div>
              <Link to={link} className={styles.cardAction}>
                <Button variant="secondary" fullWidth>바로 가기</Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
