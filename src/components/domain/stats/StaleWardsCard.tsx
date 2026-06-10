import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import type { LastVisitEntry } from '@/utils/visitStats'
import styles from './StaleWardsCard.module.scss'

interface Props {
  entries: LastVisitEntry[]
  onSelect?: (entry: LastVisitEntry) => void
}

export function StaleWardsCard({ entries, onSelect }: Props) {
  const { t } = useTranslation()

  if (entries.length === 0) {
    return <p className={styles.empty}>{t('stats.noData')}</p>
  }

  return (
    <ol className={styles.list}>
      {entries.map((e, i) => (
        <li key={e.id}>
          <button type="button" className={styles.row} onClick={() => onSelect?.(e)}>
            <span className={styles.rank}>{i + 1}</span>
            <span className={styles.name}>{e.name}</span>
            <span className={clsx(styles.days, styles[e.severity])}>
              {e.daysSince === null
                ? t('stats.neverVisited')
                : t('stats.daysAgo', { count: e.daysSince })}
            </span>
            <ChevronRight size={15} className={styles.chevron} />
          </button>
        </li>
      ))}
    </ol>
  )
}
