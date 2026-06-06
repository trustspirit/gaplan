import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Link } from 'react-router-dom'
import { Users, ListChecks, CalendarCheck, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui'
import { ScheduleFormModal } from '@/components/domain'
import styles from './AdminDashboard.module.scss'

const ACTION_CARD_DEFS = [
  { icon: Users, titleKey: 'admin.users', descKey: 'admin.inviteDesc', link: '/admin/users' },
  { icon: ListChecks, titleKey: 'admin.taskCreate', descKey: 'admin.taskCreateDesc', link: '/admin/tasks' },
  { icon: MapPin, titleKey: 'admin.visitPlanner', descKey: 'admin.visitPlannerDesc', link: '/admin/visit-planner' },
  { icon: CalendarCheck, titleKey: 'admin.calendar', descKey: 'admin.calendarDesc', link: '/admin/calendar' },
] as const

export function AdminDashboard() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const [formOpen, setFormOpen] = useState(false)
  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext={t('admin.dashboard')} />}
    >
      <div className={styles.page}>
        <div className={styles.quickActions}>
          <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
            + 일정 추가
          </Button>
        </div>
        <div className={styles.cardGrid}>
          {ACTION_CARD_DEFS.map(({ icon: Icon, titleKey, descKey, link }) => (
            <div key={link} className={styles.actionCard}>
              <div className={styles.cardIcon}>
                <Icon size={28} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{t(titleKey)}</h3>
                <p className={styles.cardDesc}>{t(descKey)}</p>
              </div>
              <Link to={link} className={styles.cardAction}>
                <Button variant="secondary" fullWidth>{t('common.goTo')}</Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
      {formOpen && (
        <ScheduleFormModal
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); toast.success('일정이 등록되었습니다.') }}
        />
      )}
    </AppShell>
  )
}
