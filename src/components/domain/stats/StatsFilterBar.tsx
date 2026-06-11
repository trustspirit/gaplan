import { useTranslation } from 'react-i18next'
import type { Region } from '@/types/region'
import type { StatsFilters, StatsPeriod } from '@/utils/visitStats'
import styles from './StatsFilterBar.module.scss'

interface Props {
  filters: StatsFilters
  regions: Region[]            // 허용 지역 (admin=전체, seventy=본인 지역)
  showAllOption: boolean       // '전체' 옵션 표시 여부
  onChange: (next: StatsFilters) => void
}

const PERIODS: { value: StatsPeriod; key: string }[] = [
  { value: '3m', key: 'stats.period3m' },
  { value: '6m', key: 'stats.period6m' },
  { value: '12m', key: 'stats.period12m' },
  { value: 'thisYear', key: 'stats.periodThisYear' },
]

export function StatsFilterBar({ filters, regions, showAllOption, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className={styles.bar}>
      <select
        className={styles.select}
        value={filters.regionId}
        onChange={e => onChange({ ...filters, regionId: e.target.value })}
        aria-label={t('stats.regionFilter')}
      >
        {showAllOption && <option value="all">{t('stats.allRegions')}</option>}
        {regions.map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>

      <select
        className={styles.select}
        value={filters.period}
        onChange={e => onChange({ ...filters, period: e.target.value as StatsPeriod })}
        aria-label={t('stats.periodFilter')}
      >
        {PERIODS.map(p => (
          <option key={p.value} value={p.value}>{t(p.key)}</option>
        ))}
      </select>

    </div>
  )
}
