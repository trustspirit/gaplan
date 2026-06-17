import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import type { MonthEntry } from '@/utils/visitStats'

const MonthlyTrendLineChart = lazy(() =>
  import('./MonthlyTrendLineChart').then(module => ({ default: module.MonthlyTrendLineChart })),
)

interface Props {
  data: MonthEntry[]
}

const emptyStyle = { color: '#94a3b8', fontSize: 13, textAlign: 'center' as const, padding: '24px 0' }

export function MonthlyTrendChart({ data }: Props) {
  const { t } = useTranslation()
  const hasData = data.some(d => d.count > 0)

  if (!hasData) {
    return (
      <p style={emptyStyle}>
        {data.length === 0 ? t('stats.noData') : t('stats.noVisitsInPeriod')}
      </p>
    )
  }

  return (
    <Suspense fallback={<p style={emptyStyle}>{t('common.loading')}</p>}>
      <MonthlyTrendLineChart data={data} />
    </Suspense>
  )
}
