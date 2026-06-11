import { useState, type ComponentType } from 'react'
import { useAtomValue } from 'jotai'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { useSchedulePageData } from '@/hooks/useSchedulePageData'
import { useEffectiveScope } from '@/hooks/useEffectiveScope'
import { deleteScheduleViaCF } from '@/services/scheduleService'
import { useDeleteWithUndo } from '@/hooks/useDeleteWithUndo'
import { Button } from '@/components/ui'
import { EditScheduleModal, ScheduleFormModal, ScheduleItem } from '@/components/domain'
import type { Schedule, ScheduleType } from '@/types'
import { canUseAdminTools } from '@/utils/permissions'
import { ALL_UNITS, REGIONS } from '@/constants/regions'
import styles from './ScheduleTypePage.module.scss'

type FilterTab = 'all' | 'upcoming' | 'completed'
type TranslationPrefix = 'visits' | 'interviews'

interface ScheduleTypePanelProps {
  translationPrefix: TranslationPrefix
  scheduleType: Extract<ScheduleType, 'ward_visit' | 'interview'>
  EmptyIcon: ComponentType<{ size?: number; className?: string }>
  taskPath: string
  sideTitleKey: string
  showWardInUpcoming?: boolean
}

const TABS: FilterTab[] = ['all', 'upcoming', 'completed']

function emptyDescriptionKey(prefix: TranslationPrefix, activeTab: FilterTab) {
  if (activeTab === 'upcoming') return `${prefix}.noUpcoming`
  if (activeTab === 'completed') return `${prefix}.noCompleted`
  return `${prefix}.noAll`
}

export function ScheduleTypePanel({
  translationPrefix,
  scheduleType,
  EmptyIcon,
  taskPath,
  sideTitleKey,
  showWardInUpcoming,
}: ScheduleTypePanelProps) {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const [filterRegion, setFilterRegion] = useState<string | null>(null)
  const { pendingIds: deletingIds, scheduleDelete } = useDeleteWithUndo()

  const scope = useEffectiveScope()

  const allowedRegions = scope.regionIds != null
    ? REGIONS.filter(r => scope.regionIds!.includes(r.id))
    : []

  const filters =
    user.role === 'president'
      ? { presidentUid: user.uid }
      : user.role === 'seventy'
        ? { seventyUid: user.uid }
        : user.role === 'exec_secretary'
          ? { seventyUid: user.assignedSeventyUid ?? '' }
          : {}

  const { schedules: rawSchedules } = useSchedules(filters)
  const { getUnitName } = useUnits()

  const schedules = (filterRegion != null
    ? rawSchedules.filter(s => ALL_UNITS.find(u => u.id === s.unitId)?.regionId === filterRegion)
    : rawSchedules
  ).filter(s => !deletingIds.has(s.id))

  const { orderedKeys, grouped, upcomingList, thisMonthCount, upcomingCount, completedCount } =
    useSchedulePageData(schedules, scheduleType, activeTab)

  return (
    <div className={styles.layout}>
      <div className={styles.mainCol}>
        {canUseAdminTools(user) && (
          <div className={styles.pageHeader}>
            <Button variant="secondary" size="sm" onClick={() => navigate(taskPath)}>
              {t(`${translationPrefix}.createTask`)}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
              + {t(`${translationPrefix}.addSchedule`)}
            </Button>
          </div>
        )}

        {allowedRegions.length > 1 && (
          <div className={styles.regionFilter}>
            <button
              type="button"
              className={styles.regionChip}
              data-active={filterRegion === null}
              onClick={() => setFilterRegion(null)}
            >
              {t('common.all')}
            </button>
            {allowedRegions.map(r => (
              <button
                key={r.id}
                type="button"
                className={styles.regionChip}
                data-active={filterRegion === r.id}
                onClick={() => setFilterRegion(r.id)}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{thisMonthCount}</span>
            <span className={styles.statLabel}>{t(`${translationPrefix}.thisMonth`)}</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statCard}>
            <span className={styles.statValue}>{upcomingCount}</span>
            <span className={styles.statLabel}>{t(`${translationPrefix}.upcoming`)}</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statCard}>
            <span className={styles.statValue}>{completedCount}</span>
            <span className={styles.statLabel}>{t(`${translationPrefix}.completed`)}</span>
          </div>
        </div>

        <div className={styles.tabBar}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={styles.tabBtn}
              data-active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {t(`${translationPrefix}.tabs.${tab}`)}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {orderedKeys.length === 0 ? (
            <div className={styles.empty}>
              <EmptyIcon size={32} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>{t(`${translationPrefix}.empty`)}</p>
              <p className={styles.emptyDesc}>
                {t(emptyDescriptionKey(translationPrefix, activeTab))}
              </p>
            </div>
          ) : (
            orderedKeys.map((monthKey) => {
              const items = grouped.get(monthKey)!
              return (
                <div key={monthKey} className={styles.monthGroup}>
                  <h3 className={styles.monthLabel}>{dayjs(monthKey).format('YYYY년 M월')}</h3>
                  <div className={styles.itemList}>
                    {items.map((schedule) => (
                      <ScheduleItem
                        key={schedule.id}
                        schedule={schedule}
                        unitName={getUnitName(schedule.unitId)}
                        showCalendarAdd={user.role === 'president'}
                        canEdit={canUseAdminTools(user) || user.role === 'seventy'}
                        onEdit={() => setEditTarget(schedule)}
                        onDelete={() => scheduleDelete(schedule.id, () => deleteScheduleViaCF(schedule.id), t('admin.scheduleCancelSuccess'))}
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
          initialType={scheduleType}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            toast.success(t('schedule.savedSuccess'))
          }}
        />
      )}
      {editTarget && (
        <EditScheduleModal
          schedule={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null)
            toast.success(t('admin.scheduleEditSuccess'))
          }}
          onDelete={() => { scheduleDelete(editTarget.id, () => deleteScheduleViaCF(editTarget.id), t('admin.scheduleCancelSuccess')); setEditTarget(null) }}
        />
      )}

      {upcomingList.length > 0 && (
        <div className={styles.sideCol}>
          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>{t(sideTitleKey)}</div>
            <div className={styles.sideCardBody}>
              {upcomingList.map((schedule) => (
                <div key={schedule.id} className={styles.upcomingItem}>
                  <span className={styles.upcomingDate}>
                    {dayjs(schedule.date).format('M/D (ddd)')}
                  </span>
                  <span className={styles.upcomingUnit}>
                    {getUnitName(schedule.unitId)}
                    {showWardInUpcoming && schedule.wardName && (
                      <span className={styles.upcomingWard}> · {schedule.wardName}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
