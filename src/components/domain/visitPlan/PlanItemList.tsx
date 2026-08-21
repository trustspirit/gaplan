import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { Trash2, AlertTriangle } from 'lucide-react'
import { findNearbyEvents } from '@/utils/visitPlanContext'
import type { LastVisitEntry } from '@/utils/visitStats'
import type { VisitPlanItem, GeneralSchedule } from '@/types'
import { DataList, type DataListRow } from '@/components/ui'
import styles from './PlanItemList.module.scss'

interface Props {
  items: VisitPlanItem[]
  lastVisitByWard: Map<string, LastVisitEntry>
  generalSchedules: GeneralSchedule[]
  onRemove: (itemId: string) => void
  pendingDeleteIds?: Set<string>
}

export function PlanItemList({
  items,
  lastVisitByWard,
  generalSchedules,
  onRemove,
  pendingDeleteIds,
}: Props) {
  const { t } = useTranslation()

  const visibleItems = pendingDeleteIds
    ? items.filter((i) => !pendingDeleteIds.has(i.itemId))
    : items

  if (visibleItems.length === 0) {
    return <p className={styles.empty}>{t('visitPlan.noItems')}</p>
  }

  const sorted = [...visibleItems].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  )

  const rows: DataListRow[] = sorted.map((item) => {
    const recency = lastVisitByWard.get(item.wardName)
    const nearby = findNearbyEvents(item.date, item.unitId, generalSchedules)
    const severity = recency?.severity ?? 'red'

    return {
      id: item.itemId,
      title: `${item.wardName} · ${dayjs(item.date).format('M.D(ddd)')} ${item.startTime}`,
      meta: recency
        ? recency.daysSince === null
          ? t('stats.neverVisited')
          : t('stats.daysAgo', { count: recency.daysSince })
        : undefined,
      // 마지막 방문 이후 경과(recency)를 왼쪽 스트라이프 대신 작은 점으로 —
      // 판정 R57. 실제 상태 텍스트(위 meta)는 그대로 남고, 점은 곁다리 강조일 뿐이다.
      // recency가 아예 없으면 meta는 비어 있으므로, 이 점이 행의 유일한 신호가
      // 될 수 있다 — 색만으로 등급을 전달하지 않도록 title/aria-label을 단다.
      badges: (
        <>
          <span
            className={clsx(styles.severityDot, styles[`severity_${severity}`])}
            role="img"
            aria-label={t(`stats.severity.${severity}`)}
            title={t(`stats.severity.${severity}`)}
          />
          {nearby.length > 0 && (
            <span className={styles.warn}>
              <AlertTriangle size={11} /> {t('visitPlan.nearConference')}
            </span>
          )}
        </>
      ),
      actions: (
        <button
          type="button"
          className={styles.del}
          onClick={() => onRemove(item.itemId)}
          aria-label={t('common.delete')}
        >
          <Trash2 size={14} />
        </button>
      ),
    }
  })

  return <DataList rows={rows} aria-label={t('visitPlan.plannedVisits')} />
}
