import { useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { useVisitStats } from '@/hooks/useVisitStats'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody } from '@/components/ui'
import {
  StatsFilterBar,
  VisitCountBarChart,
  MonthlyTrendChart,
  LastVisitList,
  StaleWardsCard,
} from '@/components/domain'
import { REGIONS } from '@/constants/regions'
import { useEffectiveScope } from '@/hooks/useEffectiveScope'
import type { StatsFilters } from '@/utils/visitStats'
import styles from './StatsPage.module.scss'

export function StatsPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const scope = useEffectiveScope()

  const allowedRegions = useMemo(() => {
    if (scope.regionIds === null) return REGIONS
    const ids = new Set(scope.regionIds)
    return REGIONS.filter(r => ids.has(r.id))
  }, [scope])

  const showAllOption = scope.regionIds === null || allowedRegions.length > 1

  const [filters, setFilters] = useState<StatsFilters>({
    regionId: showAllOption ? 'all' : (allowedRegions[0]?.id ?? 'all'),
    period: '6m',
    granularity: 'ward',
  })

  const { stats, loading } = useVisitStats(filters)

  const granularityLabel = filters.granularity === 'ward'
    ? t('stats.granularityWard')
    : t('stats.granularityUnit')

  return (
    <AppShell
      role={user.role}
      name={user.name}
      topBar={<TopBar name={user.name} subtext={t('stats.subtext')} />}
    >
      <div className={styles.page}>
        <StatsFilterBar
          filters={filters}
          regions={allowedRegions}
          showAllOption={showAllOption}
          onChange={setFilters}
        />

        {loading ? (
          <p className={styles.loading}>{t('stats.loading')}</p>
        ) : (
          <>
            <div className={styles.grid}>
              <Card>
                <CardHeader title={t('stats.byRegion')} />
                <CardBody><VisitCountBarChart data={stats.byRegion} /></CardBody>
              </Card>
              <Card>
                <CardHeader title={t('stats.byUnit')} />
                <CardBody><VisitCountBarChart data={stats.byUnit} /></CardBody>
              </Card>
              <Card>
                <CardHeader title={t('stats.monthlyTrend')} />
                <CardBody><MonthlyTrendChart data={stats.monthlyTrend} /></CardBody>
              </Card>
              <Card>
                <CardHeader title={`${t('stats.lastVisit')} · ${granularityLabel}`} />
                <CardBody><LastVisitList entries={stats.lastVisit} /></CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader title={`${t('stats.staleTitle')} · ${granularityLabel}`} />
              <CardBody>
                <StaleWardsCard
                  entries={stats.staleTopN}
                  onSelect={() => toast.info(t('stats.selectHint'))}
                />
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
