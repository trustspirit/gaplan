import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import type { LastVisitEntry } from '@/utils/visitStats'
import styles from './LastVisitList.module.scss'

interface Props {
  entries: LastVisitEntry[]
}

export function LastVisitList({ entries }: Props) {
  const { t } = useTranslation()

  if (entries.length === 0) {
    return <p className={styles.empty}>{t('stats.noData')}</p>
  }

  // 방문 있은 것 우선(가까운 순), 이력 없음은 뒤로
  const sorted = [...entries].sort((a, b) => {
    if (a.daysSince === null && b.daysSince === null) return a.name.localeCompare(b.name)
    if (a.daysSince === null) return 1
    if (b.daysSince === null) return -1
    return a.daysSince - b.daysSince
  })

  return (
    <ul className={styles.list}>
      {sorted.map(e => (
        <li key={e.id} className={styles.row}>
          <span className={clsx(styles.dot, styles[e.severity])} />
          <span className={styles.name}>{e.name}</span>
          <span className={styles.days}>
            {e.daysSince === null
              ? t('stats.neverVisited')
              : t('stats.daysAgo', { count: e.daysSince })}
          </span>
        </li>
      ))}
    </ul>
  )
}
