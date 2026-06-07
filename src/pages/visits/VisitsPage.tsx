import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { AppShell, TopBar } from '@/components/layout'
import { Button } from '@/components/ui'
import type { Schedule } from '@/types'
import { ScheduleItem, ScheduleFormModal, EditScheduleModal } from '@/components/domain'
import { useSchedulePageData } from '@/hooks/useSchedulePageData'
import styles from './VisitsPage.module.scss'

type FilterTab = 'all' | 'upcoming' | 'completed'

export function VisitsPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)

  const filters = user.role === 'president'
    ? { presidentUid: user.uid }
    : user.role === 'seventy'
      ? { seventyUid: user.uid }
      : {}

  const { schedules } = useSchedules(filters)
  const { getUnitName } = useUnits()

  const {
    orderedKeys,
    grouped,
    upcomingList: upcomingVisits,
    thisMonthCount,
    upcomingCount,
    completedCount,
  } = useSchedulePageData(schedules, 'ward_visit', activeTab)

  const TABS: FilterTab[] = ['all', 'upcoming', 'completed']

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={t('visits.title')} />}>
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          {user.role === 'admin' && (
            <div className={styles.pageHeader}>
              <Button variant="secondary" size="sm" onClick={() => navigate('/admin/visit-planner')}>
                태스크 생성
              </Button>
              <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                + 방문 일정 추가
              </Button>
            </div>
          )}
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
                          canEdit={user.role === 'admin' || user.role === 'seventy'}
                          onEdit={() => setEditTarget(s)}
                          onDelete={() => setDeleteTarget(s)}
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
            initialType="ward_visit"
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
        {deleteTarget && (
          <EditScheduleModal
            schedule={deleteTarget}
            initialConfirmDelete
            onClose={() => setDeleteTarget(null)}
            onSaved={() => { setDeleteTarget(null); toast.success(t('admin.scheduleCancelSuccess')) }}
          />
        )}
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
                    <span className={styles.upcomingUnit}>
                      {getUnitName(s.unitId)}
                      {s.wardName && <span className={styles.upcomingWard}> · {s.wardName}</span>}
                    </span>
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
