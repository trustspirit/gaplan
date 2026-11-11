import { useTranslation } from 'react-i18next'
import { coveragePercent, type RegionCoverage } from '@/utils/visitInsights'
import styles from './RegionCoverageChart.module.scss'

/**
 * CC별 방문 분포. 막대의 길이는 방문 횟수가 아니라 **범위**(전체 와드 중 방문한 와드의 비율)다 —
 * CC마다 와드 수가 달라서 횟수로 비교하면 와드가 많은 CC가 늘 많이 간 것처럼 보인다.
 * 횟수와 와드당 평균은 글자로 곁들인다.
 */
export function RegionCoverageChart({ regions }: { regions: RegionCoverage[] }) {
  const { t } = useTranslation()

  if (regions.length === 0) return <p className={styles.empty}>{t('stats.noData')}</p>

  return (
    <ul className={styles.list}>
      {regions.map((r) => {
        const percent = coveragePercent(r.wardsVisited, r.wardsTotal)
        const perWard = r.wardsTotal > 0 ? (r.visits / r.wardsTotal).toFixed(1) : '0.0'
        return (
          <li key={r.id} className={styles.row}>
            <div className={styles.head}>
              <span className={styles.name}>{r.name}</span>
              <span className={styles.value}>
                <strong>{percent}%</strong>
                <span className={styles.fraction}>
                  {t('stats.coverageFraction', { visited: r.wardsVisited, total: r.wardsTotal })}
                </span>
              </span>
            </div>
            <div
              className={styles.track}
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={t('stats.coverageAria', { name: r.name })}
            >
              <div className={styles.fill} style={{ width: `${percent}%` }} />
            </div>
            <p className={styles.note}>{t('stats.regionVisits', { count: r.visits, avg: perWard })}</p>
          </li>
        )
      })}
    </ul>
  )
}
