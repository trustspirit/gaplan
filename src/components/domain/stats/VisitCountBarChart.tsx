import { useTranslation } from 'react-i18next'
import type { CountEntry } from '@/utils/visitStats'
import styles from './VisitCountBarChart.module.scss'

interface Props {
  data: CountEntry[]
}

export function VisitCountBarChart({ data }: Props) {
  const { t } = useTranslation()
  const sorted = [...data].sort((a, b) => b.count - a.count)
  const max = Math.max(...sorted.map(d => d.count), 1)

  if (data.length === 0) {
    return <p className={styles.empty}>{t('stats.noData')}</p>
  }

  return (
    <div className={styles.chart}>
      {sorted.map(d => (
        <div key={d.id} className={styles.row}>
          <span className={styles.label}>{d.name}</span>
          <div className={styles.track}>
            <div
              className={styles.bar}
              style={{
                width: d.count === 0 ? '0%' : `${Math.max((d.count / max) * 100, 3)}%`,
                minWidth: d.count === 0 ? 0 : undefined,
              }}
            />
          </div>
          <span className={styles.count}>{d.count}</span>
        </div>
      ))}
    </div>
  )
}
