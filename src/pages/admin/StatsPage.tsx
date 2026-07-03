import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useVisitStats } from '@/hooks/useVisitStats'
import { useTopBar } from '@/hooks/useTopBar'
import { Card, CardHeader, CardBody, Button, Skeleton } from '@/components/ui'
import { StatsFilterBar } from '@/components/domain/stats/StatsFilterBar'
import { VisitCountBarChart } from '@/components/domain/stats/VisitCountBarChart'
import { MonthlyTrendChart } from '@/components/domain/stats/MonthlyTrendChart'
import { LastVisitList } from '@/components/domain/stats/LastVisitList'
import { StaleWardsCard } from '@/components/domain/stats/StaleWardsCard'
import { REGIONS } from '@/constants/regions'
import { useEffectiveScope } from '@/hooks/useEffectiveScope'
import type { StatsFilters } from '@/utils/visitStats'
import styles from './StatsPage.module.scss'

export function StatsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const scope = useEffectiveScope()
  useTopBar({ subtext: t('stats.subtext'), helpInfoKey: 'pageHelp.stats' })

  const allowedRegions = useMemo(() => {
    if (scope.regionIds === null) return REGIONS
    const ids = new Set(scope.regionIds)
    return REGIONS.filter((r) => ids.has(r.id))
  }, [scope])

  const showAllOption = scope.regionIds === null || allowedRegions.length > 1

  const [filters, setFilters] = useState<StatsFilters>({
    regionId: showAllOption ? 'all' : (allowedRegions[0]?.id ?? 'all'),
    period: '6m',
  })

  const { stats, loading, error, reload } = useVisitStats(filters)

  return (
    <div className={styles.page}>
      <StatsFilterBar
        filters={filters}
        regions={allowedRegions}
        showAllOption={showAllOption}
        onChange={setFilters}
      />

      {loading ? (
        // skeletons match the chart grid so content doesn't jump on load
        <div className={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardBody>
                <Skeleton height="280px" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorBanner} role="alert">
          <span>{t('stats.loadFailed')}</span>
          <Button variant="secondary" size="sm" onClick={reload}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            <Card>
              <CardHeader title={t('stats.byRegion')} />
              <CardBody>
                <VisitCountBarChart data={stats.byRegion} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('stats.byUnit')} />
              <CardBody>
                <VisitCountBarChart data={stats.byUnit} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('stats.monthlyTrend')} />
              <CardBody>
                <MonthlyTrendChart data={stats.monthlyTrend} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('stats.lastVisit')} />
              <CardBody>
                <LastVisitList entries={stats.lastVisit} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title={t('stats.staleTitle')} />
            <CardBody>
              <StaleWardsCard
                entries={stats.staleTopN}
                onSelect={(entry) =>
                  navigate('/admin/visit-plans', { state: { wardName: entry.name } })
                }
              />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
