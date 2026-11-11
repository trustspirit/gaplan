import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useVisitStats } from '@/hooks/useVisitStats'
import { useTopBar } from '@/hooks/useTopBar'
import { Card, CardHeader, CardBody, Button, Skeleton, StatCard } from '@/components/ui'
import { StatsFilterBar } from '@/components/domain/stats/StatsFilterBar'
import { MonthlyTrendChart } from '@/components/domain/stats/MonthlyTrendChart'
import { RegionCoverageChart } from '@/components/domain/stats/RegionCoverageChart'
import { WardCoverageGrid } from '@/components/domain/stats/WardCoverageGrid'
import { VisitPriorityList } from '@/components/domain/stats/VisitPriorityList'
import { InterviewStatusTable } from '@/components/domain/stats/InterviewStatusTable'
import { REGIONS } from '@/constants/regions'
import { useEffectiveScope } from '@/hooks/useEffectiveScope'
import { ROUTES } from '@/router/routes'
import type { StatsFilters } from '@/utils/visitStats'
import { coveragePercent } from '@/utils/visitInsights'
import styles from './StatsPage.module.scss'

/**
 * 방문·접견 통계. 이 페이지가 답하는 질문은 넷이다:
 *   CC별로 방문이 고르게 갔는가 / 스테이크·와드별로 고르게 갔는가 /
 *   방문 계획을 세울 때 어디부터 갈 것인가 / 스테이크 회장 접견을 했는가.
 * 예전에는 방문 횟수만 세는 막대그래프였다 — 횟수로는 "어디가 빠졌는지"가 보이지 않는다.
 */
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

  const { stats, insights, loading, error, reload } = useVisitStats(filters)
  const { summary } = insights

  // 와드를 누르면 그 와드를 들고 방문 계획으로 간다.
  const planVisit = (ward: { name: string }) =>
    navigate(ROUTES.planVisits, { state: { wardName: ward.name } })

  return (
    <div className={styles.page}>
      <StatsFilterBar
        filters={filters}
        regions={allowedRegions}
        showAllOption={showAllOption}
        onChange={setFilters}
      />

      {loading ? (
        // skeletons match the layout so content doesn't jump on load
        <>
          <div className={styles.summary}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height="92px" />
            ))}
          </div>
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardBody>
                <Skeleton height="240px" />
              </CardBody>
            </Card>
          ))}
        </>
      ) : error ? (
        <div className={styles.errorBanner} role="alert">
          <span>{t('stats.loadFailed')}</span>
          <Button variant="secondary" size="sm" onClick={reload}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.summary}>
            <StatCard
              label={t('stats.summaryVisits')}
              value={summary.visits}
              unit={t('stats.summaryVisitsUnit')}
            />
            <StatCard
              label={t('stats.summaryCoverage')}
              value={coveragePercent(summary.wardsVisited, summary.wardsTotal)}
              unit="%"
              note={t('stats.summaryCoverageNote', {
                visited: summary.wardsVisited,
                total: summary.wardsTotal,
              })}
            />
            <StatCard
              label={t('stats.summaryNever')}
              value={summary.wardsNeverVisited}
              unit={t('stats.summaryNeverUnit')}
              note={t('stats.summaryNeverNote')}
              tone={summary.wardsNeverVisited > 0 ? 'warning' : 'neutral'}
            />
            <StatCard
              label={t('stats.summaryInterview')}
              value={coveragePercent(summary.interviewUnitsDone, summary.interviewUnitsTotal)}
              unit="%"
              note={t('stats.summaryInterviewNote', {
                done: summary.interviewUnitsDone,
                total: summary.interviewUnitsTotal,
              })}
            />
          </div>

          <div className={styles.grid}>
            <Card>
              <CardHeader title={t('stats.regionCoverageTitle')} />
              <CardBody>
                <p className={styles.desc}>{t('stats.regionCoverageDesc')}</p>
                <RegionCoverageChart regions={insights.regions} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('stats.monthlyTrend')} />
              <CardBody>
                <MonthlyTrendChart data={stats.monthlyTrend} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title={t('stats.wardGridTitle')} />
            <CardBody>
              <p className={styles.desc}>{t('stats.wardGridDesc')}</p>
              <WardCoverageGrid units={insights.units} onSelect={planVisit} />
            </CardBody>
          </Card>

          <div className={styles.grid}>
            <Card>
              <CardHeader title={t('stats.priorityTitle')} />
              <CardBody>
                <p className={styles.desc}>{t('stats.priorityDesc')}</p>
                <VisitPriorityList wards={insights.priority} onSelect={planVisit} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('stats.interviewTitle')} />
              <CardBody>
                <p className={styles.desc}>{t('stats.interviewDesc')}</p>
                <InterviewStatusTable rows={insights.interviews} />
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
