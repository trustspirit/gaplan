import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Info, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { REGIONS } from '@/constants/regions'
import { aiUnavailable, reviewVisitPlan, type PlanReviewSuggestion } from '@/services/visitRequestService'
import { checkPlanBalance, hasStakePlan, type BalanceIssue } from '../../../../functions/src/visitPlanBalance'
import type { SundayStatus } from '../../../../functions/src/visitSundayAvailability'
import type { VisitRequest, WardVisitStat } from '@/types'
import { PlanMatrix } from './PlanMatrix'
import { planMatrix } from './stakeSundayMatrix'
import styles from './PlanBalance.module.scss'

interface Props {
  request: VisitRequest
  sundayStatus: Record<string, SundayStatus>
  wardStats: Record<string, WardVisitStat>
  /** 일요일 상황·방문 기록을 받았는가. 받기 전·실패면 점검도 다시 채우기도 하지 않는다(빈 자료로 덮어쓰지 않게) */
  load: 'loading' | 'ready' | 'failed'
  /** 추천대로 (다시) 채우기 — 확인 시트는 부르는 쪽이 띄운다 */
  onRefill: () => void
  refilling?: boolean
}

/**
 * 스테이크별 일요일 배정이 고르게 갔는지 — 칩을 바꿀 때마다 요청 문서가 갱신되고 여기서 다시 계산한다.
 * 칠십인·집행서기 화면 전용(회장 링크에는 나가지 않는다).
 */
export function PlanBalance({ request, sundayStatus, wardStats, load, onRefill, refilling }: Props) {
  const { t } = useTranslation()
  const today = dayjs().format('YYYY-MM-DD')
  const issues = useMemo(
    () => checkPlanBalance({ request, status: sundayStatus, wardStats, today }),
    [request, sundayStatus, wardStats, today],
  )
  const matrix = useMemo(
    () => planMatrix({ request, roles: request.unitSundayRoles ?? {}, status: sundayStatus, wardStats }),
    [request, sundayStatus, wardStats],
  )
  const unitName = (id?: string) => request.units.find((u) => u.id === id)?.ko ?? id ?? ''
  const regionName = (id?: string) =>
    request.regions?.find((r) => r.id === id)?.name ?? REGIONS.find((r) => r.id === id)?.name ?? id ?? ''
  const text = (i: BalanceIssue) =>
    t(`visitRequest.balance.${i.kind}`, {
      date: i.date ? dayjs(i.date).format('M/D') : '',
      unit: unitName(i.unitId),
      region: regionName(i.regionId),
      count: i.count,
      min: i.min,
      max: i.max,
      expected: i.expected,
    })

  const legacy = !hasStakePlan(request)
  const ready = load === 'ready'
  // AI 검토는 누를 때만 — 받은 뒤 배정이 바뀌면 "다시 검토" 표시만 하고 저절로 부르지 않는다
  const planKey = JSON.stringify(request.unitSundays ?? null)
  const [review, setReview] = useState<{ key: string; suggestions: PlanReviewSuggestion[] } | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const askReview = async () => {
    setReviewing(true)
    try {
      setReview({ key: planKey, suggestions: await reviewVisitPlan(request.id) })
    } catch (err) {
      toast.error(aiUnavailable(err) ? t('visitRequest.ai.unavailable') : t('visitRequest.ai.failed'))
    } finally {
      setReviewing(false)
    }
  }
  const warnings = issues.filter((i) => i.level === 'warn').length

  return (
    <section className={styles.box} aria-label={t('visitRequest.balance.title')}>
      <div className={styles.head}>
        <h3 className={styles.title}>{t('visitRequest.balance.title')}</h3>
        {!legacy && ready && (
          <span className={clsx(styles.summary, warnings > 0 && styles.summaryWarn)}>
            {warnings > 0
              ? t('visitRequest.balance.warnCount', { count: warnings })
              : issues.length > 0
                ? t('visitRequest.balance.noteCount', { count: issues.length })
                : null}
          </span>
        )}
        <Button
          size="sm"
          variant={legacy ? 'primary' : 'ghost'}
          loading={refilling}
          disabled={!ready}
          onClick={onRefill}
          className={styles.refill}
        >
          {!legacy && <RotateCcw size={14} aria-hidden />}
          {legacy ? t('visitRequest.balance.fill') : t('visitRequest.balance.refill')}
        </Button>
      </div>

      {!ready ? (
        <p className={styles.legacy}>
          {t(load === 'failed' ? 'visitRequest.balance.loadFailed' : 'visitRequest.balance.loading')}
        </p>
      ) : legacy ? (
        <p className={styles.legacy}>{t('visitRequest.balance.legacy')}</p>
      ) : null}
      {ready && !legacy && <PlanMatrix matrix={matrix} today={today} />}
      {!ready || legacy ? null : issues.length === 0 ? (
        <p className={styles.good}>
          <CheckCircle2 size={16} aria-hidden />
          {t('visitRequest.balance.allGood')}
        </p>
      ) : (
        <ul className={styles.list}>
          {issues.map((i) => (
            <li
              key={`${i.kind}-${i.date ?? ''}-${i.unitId ?? ''}-${i.regionId ?? ''}`}
              className={clsx(styles.item, i.level === 'warn' ? styles.warn : styles.info)}
            >
              {i.level === 'warn' ? (
                <AlertTriangle size={14} aria-hidden className={styles.icon} />
              ) : (
                <Info size={14} aria-hidden className={styles.icon} />
              )}
              <span>{text(i)}</span>
            </li>
          ))}
        </ul>
      )}
      {!legacy && (
        <div className={styles.ai}>
          {!review && (
            <div className={styles.aiHead}>
              <Button size="sm" variant="secondary" loading={reviewing} onClick={askReview}>
                {t('visitRequest.ai.button')}
              </Button>
              <span className={styles.aiHint}>{t('visitRequest.ai.hint')}</span>
            </div>
          )}
          {review && (
            <div className={styles.aiResult}>
              <div className={styles.aiTitle}>
                <span>{t('visitRequest.ai.title')}</span>
                {review.key !== planKey && <span className={styles.aiStale}>{t('visitRequest.ai.stale')}</span>}
                <Button size="sm" variant="ghost" loading={reviewing} onClick={askReview} className={styles.aiAgain}>
                  {t('visitRequest.ai.again')}
                </Button>
              </div>
              {review.suggestions.length === 0 ? (
                <p className={styles.aiEmpty}>{t('visitRequest.ai.empty')}</p>
              ) : (
                <ul className={styles.aiList}>
                  {review.suggestions.map((s, i) => (
                    <li key={i} className={clsx(styles.aiItem, s.level === 'warn' && styles.aiWarn)}>
                      {s.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
