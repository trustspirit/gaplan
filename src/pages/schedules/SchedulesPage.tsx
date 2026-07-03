import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, Users } from 'lucide-react'
import { useTopBar } from '@/hooks/useTopBar'
import { ScheduleTypePanel } from './ScheduleTypePanel'
import { GeneralSchedulePanel } from '@/pages/general-schedules/GeneralSchedulePanel'
import styles from './SchedulesPage.module.scss'

const TABS = [
  { key: 'visits', labelKey: 'nav.visits' },
  { key: 'interviews', labelKey: 'schedules.interviewMeetingTab' },
  { key: 'events', labelKey: 'nav.generalSchedules' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function SchedulesPage() {
  const { t } = useTranslation()
  useTopBar({ subtext: t('nav.schedules'), helpInfoKey: 'pageHelp.schedules' })
  const navigate = useNavigate()
  const { tab } = useParams<{ tab: string }>()

  const active: TabKey = TABS.some((x) => x.key === tab) ? (tab as TabKey) : 'visits'

  return (
    <>
      <div className={styles.tabBar}>
        {TABS.map((x) => (
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
          scheduleTypes={['ward_visit']}
          EmptyIcon={MapPin}
          taskPath="/admin/visit-planner"
          showTaskButton
          formInitialType="ward_visit"
        />
      )}
      {active === 'interviews' && (
        <ScheduleTypePanel
          translationPrefix="interviews"
          scheduleTypes={['interview', 'meeting']}
          EmptyIcon={Users}
          taskPath="/admin/tasks"
          showTaskButton
        />
      )}
      {active === 'events' && <GeneralSchedulePanel />}
    </>
  )
}
