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
import type { StatsFilters } from '@/utils/visitStats'
import styles from './StatsPage.module.scss'

export function StatsPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!

  const allowedRegions = useMemo(() => {
    if (user.role === 'admin') return REGIONS
    const ids = user.regionIds ?? (user.regionId ? [user.regionId] : [])
    return REGIONS.filter(r => ids.includes(r.id))
  }, [user])

  const showAllOption = user.role === 'admin' || allowedRegions.length > 1

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
          <p className={styles.loading}>{t('stats.noData')}</p>
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
