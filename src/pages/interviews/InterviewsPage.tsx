import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { Users } from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { AppShell, TopBar } from '@/components/layout'
import { ScheduleItem } from '@/components/domain'
import type { Schedule } from '@/types'
import styles from './InterviewsPage.module.scss'

type FilterTab = '전체' | '예정' | '완료'

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

export function InterviewsPage() {
  const user = useAtomValue(authUserAtom)!
  const [activeTab, setActiveTab] = useState<FilterTab>('전체')

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
    if (activeTab === '예정') return !dayjs(s.date).isBefore(today, 'day')
    if (activeTab === '완료') return dayjs(s.date).isBefore(today, 'day')
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

  const TABS: FilterTab[] = ['전체', '예정', '완료']

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext="접견 일정" />}>
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{thisMonthCount}</span>
              <span className={styles.statLabel}>이번 달 접견</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statCard}>
              <span className={styles.statValue}>{upcomingCount}</span>
              <span className={styles.statLabel}>예정 접견</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statCard}>
              <span className={styles.statValue}>{completedCount}</span>
              <span className={styles.statLabel}>완료 접견</span>
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
                {tab}
              </button>
            ))}
          </div>

          <div className={styles.content}>
            {orderedKeys.length === 0 ? (
              <div className={styles.empty}>
                <Users size={32} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>접견 일정이 없습니다</p>
                <p className={styles.emptyDesc}>
                  {activeTab === '예정' ? '아직 예정된 접견이 없습니다.' : activeTab === '완료' ? '완료된 접견이 없습니다.' : '확정된 접견 일정이 없습니다.'}
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
            <div className={styles.sideCardHeader}>다음 접견 예정</div>
            <div className={styles.sideCardBody}>
              {upcomingInterviews.length === 0 ? (
                <p className={styles.sideEmpty}>예정된 접견이 없습니다.</p>
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
