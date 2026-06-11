import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { Trash2, AlertTriangle } from 'lucide-react'
import { findNearbyEvents } from '@/utils/visitPlanContext'
import type { LastVisitEntry } from '@/utils/visitStats'
import type { VisitPlanItem, GeneralSchedule } from '@/types'
import styles from './PlanItemList.module.scss'

interface Props {
  items: VisitPlanItem[]
  lastVisitByWard: Map<string, LastVisitEntry>
  generalSchedules: GeneralSchedule[]
  onRemove: (itemId: string) => void
  pendingDeleteIds?: Set<string>
}

export function PlanItemList({ items, lastVisitByWard, generalSchedules, onRemove, pendingDeleteIds }: Props) {
  const { t } = useTranslation()

  const visibleItems = pendingDeleteIds ? items.filter(i => !pendingDeleteIds.has(i.itemId)) : items

  if (visibleItems.length === 0) {
    return <p className={styles.empty}>{t('visitPlan.noItems')}</p>
  }

  const sorted = [...visibleItems].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))

  return (
    <ul className={styles.list}>
      {sorted.map(item => {
        const recency = lastVisitByWard.get(item.wardName)
        const nearby = findNearbyEvents(item.date, item.unitId, generalSchedules)
        const severity = recency?.severity ?? 'red'
        return (
          <li key={item.itemId} className={clsx(styles.row, styles[`bar_${severity}`])}>
            <div className={styles.main}>
              <div className={styles.titleRow}>
                {item.wardName} · {dayjs(item.date).format('M.D(ddd)')} {item.startTime}
              </div>
              <div className={styles.meta}>
                {recency
                  ? (recency.daysSince === null
                      ? t('stats.neverVisited')
                      : t('stats.daysAgo', { count: recency.daysSince }))
                  : ''}
                {nearby.length > 0 && (
                  <span className={styles.warn}>
                    <AlertTriangle size={11} /> {t('visitPlan.nearConference')}
                  </span>
                )}
              </div>
            </div>
            <button type="button" className={styles.del} onClick={() => onRemove(item.itemId)} aria-label={t('common.delete')}>
              <Trash2 size={14} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
