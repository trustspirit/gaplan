import { useNavigate, useParams } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { MapPin, Users } from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { AppShell, TopBar } from '@/components/layout'
import { ScheduleTypePanel } from './ScheduleTypePanel'
import { GeneralSchedulePanel } from '@/pages/general-schedules/GeneralSchedulePanel'
import styles from './SchedulesPage.module.scss'

const TABS = [
  { key: 'visits', labelKey: 'nav.visits' },
  { key: 'interviews', labelKey: 'nav.interviews' },
  { key: 'events', labelKey: 'nav.generalSchedules' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function SchedulesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab: string }>()
  const user = useAtomValue(authUserAtom)!

  const active: TabKey = TABS.some(x => x.key === tab) ? (tab as TabKey) : 'visits'

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={t('nav.schedules')} helpInfoKey="pageHelp.schedules" />}>
      <div className={styles.tabBar}>
        {TABS.map(x => (
          <button
            key={x.key}
            type="button"
            className={styles.tabBtn}
            data-active={active === x.key}
            onClick={() => navigate(`/schedules/${x.key}`)}
          >
            {t(x.labelKey)}
          </button>
        ))}
      </div>

      {active === 'visits' && (
        <ScheduleTypePanel
          translationPrefix="visits"
          scheduleType="ward_visit"
          EmptyIcon={MapPin}
          taskPath="/admin/visit-planner"
          sideTitleKey="visits.nextVisits"
          showWardInUpcoming
        />
      )}
      {active === 'interviews' && (
        <ScheduleTypePanel
          translationPrefix="interviews"
          scheduleType="interview"
          EmptyIcon={Users}
          taskPath="/admin/tasks"
          sideTitleKey="interviews.nextInterviews"
        />
      )}
      {active === 'events' && <GeneralSchedulePanel />}
    </AppShell>
  )
}
