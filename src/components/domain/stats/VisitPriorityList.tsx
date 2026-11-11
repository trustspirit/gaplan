import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { CalendarClock, ChevronRight } from 'lucide-react'
import type { WardPriority } from '@/utils/visitInsights'
import styles from './VisitPriorityList.module.scss'

interface Props {
  wards: WardPriority[]
  onSelect?: (ward: WardPriority) => void
}

export const PRIORITY_COLLAPSED_COUNT = 12

/**
 * 방문 계획을 세울 때 어디부터 갈지. 방문 이력이 없는 곳이 먼저, 그다음은 마지막 방문이 오래된
 * 순서다(정렬은 computeVisitInsights). 이미 방문이 잡혀 있는 와드는 예정일을 보여줘 같은 곳을
 * 두 번 계획하지 않게 한다. 예전 목록은 상위 10곳에서 잘려 있어 전체를 볼 수 없었다.
 */
export function VisitPriorityList({ wards, onSelect }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (wards.length === 0) return <p className={styles.empty}>{t('stats.noData')}</p>

  const shown = expanded ? wards : wards.slice(0, PRIORITY_COLLAPSED_COUNT)

  return (
    <>
      <ol className={styles.list}>
        {shown.map((w, i) => (
          <li key={w.id}>
            <button type="button" className={styles.row} onClick={() => onSelect?.(w)}>
              <span className={styles.rank}>{i + 1}</span>
              <span className={styles.names}>
                <span className={styles.name}>{w.name}</span>
                <span className={styles.unit}>{w.unitName}</span>
              </span>
              {w.nextVisitDate && (
                <span className={styles.planned}>
                  <CalendarClock size={12} aria-hidden="true" />
                  {t('stats.planned', { date: dayjs(w.nextVisitDate).format('M.D') })}
                </span>
              )}
              <span className={styles.since}>
                {w.daysSince === null ? (
                  <strong>{t('stats.neverVisited')}</strong>
                ) : (
                  <>
                    <strong>{t('stats.daysAgo', { count: w.daysSince })}</strong>
                    <span className={styles.date}>{dayjs(w.lastVisitDate).format('YYYY.M.D')}</span>
                  </>
                )}
              </span>
              <ChevronRight size={15} className={styles.chevron} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
      {wards.length > PRIORITY_COLLAPSED_COUNT && (
        <button type="button" className={styles.more} onClick={() => setExpanded((v) => !v)}>
          {expanded ? t('stats.showLess') : t('stats.showAll', { count: wards.length })}
        </button>
      )}
    </>
  )
}
