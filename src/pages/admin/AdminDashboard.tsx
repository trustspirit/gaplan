import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Link } from 'react-router-dom'
import { Users, ListChecks, CalendarCheck, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui'
import { ScheduleItem, ScheduleFormModal, EditScheduleModal } from '@/components/domain'
import type { Schedule } from '@/types'
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
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)

  const { schedules } = useSchedules({})
  const { getUnitName } = useUnits()

  const MAX_DASHBOARD_SCHEDULES = 30
  const today = dayjs().format('YYYY-MM-DD')

  const allUpcoming = schedules
    .filter(s => s.status === 'confirmed' && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  const periodSchedules = allUpcoming.slice(0, MAX_DASHBOARD_SCHEDULES)
  const hiddenCount = allUpcoming.length - periodSchedules.length

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext={t('admin.dashboard')} />}
    >
      <div className={styles.page}>
        <div className={styles.quickActions}>
          <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
            + {t('schedule.newTitle')}
          </Button>
        </div>

        <div className={styles.upcomingSection}>
          <h2 className={styles.sectionTitle}>{t('schedule.upcoming')}</h2>
          {periodSchedules.length === 0 ? (
            <p className={styles.emptyPeriod}>{t('schedule.noUpcoming')}</p>
          ) : (
            <>
              <div className={styles.scheduleList}>
                {periodSchedules.map(s => (
                  <ScheduleItem
                    key={s.id}
                    schedule={s}
                    unitName={getUnitName(s.unitId)}
                    canEdit
                    onEdit={() => setEditTarget(s)}
                    onDelete={() => setEditTarget(s)}
                  />
                ))}
              </div>
              {hiddenCount > 0 && (
                <p className={styles.moreHint}>+{hiddenCount}건 · 전체 목록은 일정 페이지에서 확인하세요.</p>
              )}
            </>
          )}
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
          onSaved={() => { setFormOpen(false); toast.success(t('schedule.savedSuccess')) }}
        />
      )}
      {editTarget && (
        <EditScheduleModal
          schedule={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); toast.success(t('admin.scheduleEditSuccess')) }}
        />
      )}
    </AppShell>
  )
}
