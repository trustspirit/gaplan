import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { AppShell, TopBar } from '@/components/layout'
import { ScheduleItem } from '@/components/domain'
import type { Schedule } from '@/types'
import styles from './VisitsPage.module.scss'

type FilterTab = 'all' | 'upcoming' | 'completed'

function groupByMonth(schedules: Schedule[]): Map<string, Schedule[]> {
  const map = new Map<string, Schedule[]>()
  for (const s of schedules) {
    const key = dayjs(s.date).format('YYYY년 M월')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return map
}

function sortMonthKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const da = dayjs(a, 'YYYY년 M월')
    const db = dayjs(b, 'YYYY년 M월')
    return da.isBefore(db) ? -1 : 1
  })
}

export function VisitsPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const filters = user.role === 'president'
    ? { presidentUid: user.uid }
    : user.role === 'seventy'
      ? { seventyUid: user.uid }
      : {}

  const { schedules } = useSchedules(filters)
  const { getUnitName } = useUnits()

  const today = dayjs()
  const thisMonth = today.format('YYYY-M')

  const allVisits = schedules.filter(s => s.type === 'ward_visit' && s.status === 'confirmed')
  const upcomingCount = allVisits.filter(s => !dayjs(s.date).isBefore(today, 'day')).length
  const completedCount = allVisits.filter(s => dayjs(s.date).isBefore(today, 'day')).length
  const thisMonthCount = allVisits.filter(s => dayjs(s.date).format('YYYY-M') === thisMonth).length

  const filtered = allVisits.filter(s => {
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

  // Upcoming: next 5 visits (date >= today, sorted ascending)
  const upcomingVisits = allVisits
    .filter(s => !dayjs(s.date).isBefore(today, 'day'))
    .sort((a, b) => dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1)
    .slice(0, 5)

  const TABS: FilterTab[] = ['all', 'upcoming', 'completed']

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={t('visits.title')} />}>
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{thisMonthCount}</span>
              <span className={styles.statLabel}>{t('visits.thisMonth')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statCard}>
              <span className={styles.statValue}>{upcomingCount}</span>
              <span className={styles.statLabel}>{t('visits.upcoming')}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statCard}>
              <span className={styles.statValue}>{completedCount}</span>
              <span className={styles.statLabel}>{t('visits.completed')}</span>
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
                <MapPin size={32} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>{t('visits.empty')}</p>
                <p className={styles.emptyDesc}>
                  {activeTab === 'upcoming' ? t('visits.noUpcoming') : activeTab === 'completed' ? t('visits.noCompleted') : t('visits.noAll')}
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

        <div className={styles.sideCol}>
          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>{t('visits.nextVisits')}</div>
            <div className={styles.sideCardBody}>
              {upcomingVisits.length === 0 ? (
                <p className={styles.sideEmpty}>{t('visits.noUpcoming')}</p>
              ) : (
                upcomingVisits.map(s => (
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
