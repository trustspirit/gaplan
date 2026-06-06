import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui'
import { ScheduleItem, ScheduleFormModal } from '@/components/domain'
import type { Schedule } from '@/types'
import { groupByMonth, sortMonthKeys } from '@/utils/scheduleGrouping'
import styles from './InterviewsPage.module.scss'

type FilterTab = 'all' | 'upcoming' | 'completed'

export function InterviewsPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [formOpen, setFormOpen] = useState(false)

  const filters = user.role === 'president'
    ? { presidentUid: user.uid }
    : user.role === 'seventy'
      ? { seventyUid: user.uid }
      : {}

  const { schedules } = useSchedules(filters)
  const { getUnitName } = useUnits()

  const today = dayjs()
  const thisMonth = today.format('YYYY-M')

  const allInterviews = schedules.filter(s => s.type === 'interview' && s.status === 'confirmed')
  const upcomingCount = allInterviews.filter(s => !dayjs(s.date).isBefore(today, 'day')).length
  const completedCount = allInterviews.filter(s => dayjs(s.date).isBefore(today, 'day')).length
  const thisMonthCount = allInterviews.filter(s => dayjs(s.date).format('YYYY-M') === thisMonth).length

  const filtered = allInterviews.filter(s => {
    if (activeTab === 'upcoming') return !dayjs(s.date).isBefore(today, 'day')
    if (activeTab === 'completed') return dayjs(s.date).isBefore(today, 'day')
    return true
  })

  const sorted = [...filtered].sort((a, b) =>
    dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1
  )

  const grouped = groupByMonth(sorted)
  const monthKeys = sortMonthKeys(Array.from(grouped.keys()))

  // Sort: current month first, then future, then past
  const currentMonthKey = today.format('YYYY년 M월')
  const orderedKeys = [
    ...monthKeys.filter(k => k === currentMonthKey),
    ...monthKeys.filter(k => {
      const d = dayjs(k, 'YYYY년 M월')
      return d.isAfter(today, 'month')
    }),
    ...monthKeys.filter(k => {
      const d = dayjs(k, 'YYYY년 M월')
      return d.isBefore(today, 'month')
    }),
  ]

  // Upcoming: next 5 interviews (date >= today, sorted ascending)
  const upcomingInterviews = allInterviews
    .filter(s => !dayjs(s.date).isBefore(today, 'day'))
    .sort((a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1)
    .slice(0, 5)

  const TABS: FilterTab[] = ['all', 'upcoming', 'completed']

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={t('interviews.title')} />}>
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          {user.role === 'admin' && (
            <div className={styles.pageHeader}>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/region-settings')}>
                태스크 생성
              </Button>
              <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                + 접견 일정 추가
              </Button>
            </div>
          )}
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{thisMonthCount}</span>
              <span className={styles.statLabel}>{t('interviews.thisMonth')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statCard}>
              <span className={styles.statValue}>{upcomingCount}</span>
              <span className={styles.statLabel}>{t('interviews.upcoming')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statCard}>
              <span className={styles.statValue}>{completedCount}</span>
              <span className={styles.statLabel}>{t('interviews.completed')}</span>
            </div>
          </div>

          <div className={styles.tabBar}>
            {TABS.map(tab => (
              <button
                key={tab}
                type="button"
                className={styles.tabBtn}
                data-active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {t(`visits.tabs.${tab}`)}
              </button>
            ))}
          </div>

          <div className={styles.content}>
            {orderedKeys.length === 0 ? (
              <div className={styles.empty}>
                <Users size={32} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>{t('interviews.empty')}</p>
                <p className={styles.emptyDesc}>
                  {activeTab === 'upcoming' ? t('interviews.noUpcoming') : activeTab === 'completed' ? t('interviews.noCompleted') : t('interviews.noAll')}
                </p>
              </div>
            ) : (
              orderedKeys.map(monthKey => {
                const items = grouped.get(monthKey)!
                return (
                  <div key={monthKey} className={styles.monthGroup}>
                    <h3 className={styles.monthLabel}>{monthKey}</h3>
                    <div className={styles.itemList}>
                      {items.map(s => (
                        <ScheduleItem
                          key={s.id}
                          schedule={s}
                          unitName={getUnitName(s.unitId)}
                          showCalendarAdd={user.role === 'president'}
                        />
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {formOpen && (
          <ScheduleFormModal
            initialType="interview"
            onClose={() => setFormOpen(false)}
            onSaved={() => { setFormOpen(false); toast.success('일정이 등록되었습니다.') }}
          />
        )}
        <div className={styles.sideCol}>
          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>{t('interviews.nextInterviews')}</div>
            <div className={styles.sideCardBody}>
              {upcomingInterviews.length === 0 ? (
                <p className={styles.sideEmpty}>{t('interviews.noUpcoming')}</p>
              ) : (
                upcomingInterviews.map(s => (
                  <div key={s.id} className={styles.upcomingItem}>
                    <span className={styles.upcomingDate}>{dayjs(s.date).format('M/D (ddd)')}</span>
                    <span className={styles.upcomingUnit}>{getUnitName(s.unitId)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
