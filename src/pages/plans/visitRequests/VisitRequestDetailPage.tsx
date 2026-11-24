import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { ChevronLeft, Check } from 'lucide-react'
import { useVisitRequest } from '@/hooks/useVisitRequests'
import { useTopBar } from '@/hooks/useTopBar'
import {
  alreadyVisitingWard,
  decideVisitRequestDate,
  deleteVisitRequest,
  ensureUnitTokens,
  fetchSundayStatus,
  setUnitSundayPlan,
  setVisitRequestStatus,
  updateVisitRequestText,
} from '@/services/visitRequestService'
import { recommendUnitSundays } from '../../../../functions/src/visitPlanBalance'
import { ROUTES } from '@/router/routes'
import {
  candidatesForSunday,
  GUIDANCE_MAX,
  rankCandidates,
  requestProgress,
  wardRecency,
  type RecencyTone,
} from '@/utils/visitRequest'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmSheet,
  ErrorState,
  Input,
  LoadingState,
  Select,
  StatCard,
  Textarea,
} from '@/components/ui'
import { GuidanceField } from './GuidanceField'
import { StakeLinkList } from './StakeLinkList'
import { PlanBalance } from './PlanBalance'
import type { VisitRequest, WardVisitStat } from '@/types'
import {
  isFirstSunday,
  isGeneralConferenceSunday,
  type SundayStatus,
} from '../../../../functions/src/visitSundayAvailability'
import { REGIONS, getRegionColor } from '@/constants/regions'
import styles from './VisitRequestDetailPage.module.scss'

interface PendingDecision {
  date: string
  pick: { unitId: string; wardId: string; unitName: string; wardName: string } | null
}

const TONE_CLASS: Record<RecencyTone, string> = {
  fresh: styles.toneFresh,
  aging: styles.toneAging,
  stale: styles.toneStale,
  never: styles.toneStale,
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function VisitRequestDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { requestId } = useParams<{ requestId: string }>()
  const { request, recommendations, loading, error } = useVisitRequest(requestId)
  useTopBar({ subtext: request?.title })

  const [wardStats, setWardStats] = useState<Record<string, WardVisitStat>>({})
  const [sundayStatus, setSundayStatus] = useState<Record<string, SundayStatus>>({})
  const [pending, setPending] = useState<PendingDecision | null>(null)
  const [deciding, setDeciding] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [textDraft, setTextDraft] = useState<{ title: string; note: string; guidance: string } | null>(null)
  const [textSaving, setTextSaving] = useState(false)
  const [confirmRefill, setConfirmRefill] = useState(false)
  const [refilling, setRefilling] = useState(false)

  const reqId = request?.id
  const seventyUid = request?.seventyUid
  const sundaysKey = request?.sundays.join(',') ?? ''
  const decisionKey = request ? Object.keys(request.decisions ?? {}).sort().join(',') : ''
  useEffect(() => {
    if (!reqId || !seventyUid || !sundaysKey) return
    let cancelled = false
    // 일요일 상황과 와드 방문 기록(회장들이 보는 것과 같은 집계). 참고용이라 실패해도 화면은 그대로 쓴다.
    fetchSundayStatus(seventyUid, sundaysKey.split(','), reqId, { withWardStats: true })
      .then((s) => {
        if (cancelled) return
        setSundayStatus(s.status)
        setWardStats(s.wardStats ?? {})
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // 확정이 바뀌면 "다음 방문"이 달라지므로 다시 받는다.
  }, [reqId, decisionKey, seventyUid, sundaysKey])

  // 스테이크별 링크 이전에 만든 요청 — 스테이크별 토큰을 한 번 채운다(공용 링크는 더 열리지 않는다).
  const needsTokens = !!request && !request.unitTokens
  useEffect(() => {
    if (!needsTokens || !request) return
    ensureUnitTokens(request).catch(() => toast.error(t('visitRequest.linkPrepareFailed')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsTokens, reqId])

  if (loading) {
    return (
      <div className={styles.page}>
        <LoadingState shape="list" rows={4} />
      </div>
    )
  }
  if (error || !request) {
    return (
      <div className={styles.page}>
        <ErrorState title={error ? t('visitRequest.loadFailed') : t('visitRequest.notFound')} />
      </div>
    )
  }

  const unitById = new Map(request.units.map((u) => [u.id, u]))
  const progress = requestProgress(request, recommendations)
  const dateLabel = (date: string) => dayjs(date).format(`${t('recommend.dateFormat')} (ddd)`)

  const handleSaveText = async () => {
    if (!textDraft || !textDraft.title.trim()) return
    setTextSaving(true)
    try {
      await updateVisitRequestText(request.id, {
        title: textDraft.title.trim(),
        note: textDraft.note.trim(),
        guidance: textDraft.guidance.trim().slice(0, GUIDANCE_MAX),
      })
      toast.success(t('visitRequest.textSaved'))
      setTextDraft(null)
    } catch {
      toast.error(t('visitRequest.textSaveFailed'))
    } finally {
      setTextSaving(false)
    }
  }

  const handleCopy = async (text: string) => {
    if (await copyText(text)) toast.success(t('visitRequest.copied'))
    else toast.error(t('visitRequest.copyFailed'))
  }

  const handleStatus = async () => {
    const next = request.status === 'open' ? 'closed' : 'open'
    setStatusSaving(true)
    try {
      await setVisitRequestStatus(request.id, next)
      toast.success(next === 'closed' ? t('visitRequest.closed') : t('visitRequest.reopened'))
    } catch {
      toast.error(t('visitRequest.decideFailed'))
    } finally {
      setStatusSaving(false)
    }
  }

  const handleDecide = async () => {
    if (!pending) return
    setDeciding(true)
    try {
      await decideVisitRequestDate(
        request.id,
        pending.date,
        pending.pick ? { unitId: pending.pick.unitId, wardId: pending.pick.wardId } : null,
      )
      toast.success(pending.pick ? t('visitRequest.decideDone') : t('visitRequest.undecideDone'))
      setPending(null)
    } catch (e) {
      const ward = alreadyVisitingWard(e)
      toast.error(ward !== null ? t('visitRequest.alreadyVisiting', { ward }) : t('visitRequest.decideFailed'))
    } finally {
      setDeciding(false)
    }
  }

  /** 지금 방문 기록·일요일 상황으로 추천 배정을 다시 만든다. 칠십인이 막힌 날은 빼고, 확정된 날은 그대로 둔다. */
  const refill = async () => {
    const sundays = request.sundays.filter((d) => request.decisions?.[d] || !sundayStatus[d]?.busy.length)
    const plan = recommendUnitSundays({
      sundays,
      request,
      wardStats,
      unitBlocks: Object.fromEntries(sundays.map((d) => [d, sundayStatus[d]?.unitBlocks ?? {}])),
    })
    setRefilling(true)
    try {
      await setUnitSundayPlan(request.id, { unitSundays: plan.unitSundays, roles: plan.roles })
      toast.success(t('visitRequest.refillDone'))
      setConfirmRefill(false)
    } catch {
      toast.error(t('visitRequest.unitSundaysFailed'))
    } finally {
      setRefilling(false)
    }
  }
  // 이미 응답한 스테이크가 있으면 그 스테이크의 일요일도 바뀐다 — 한 번 묻는다.
  const handleRefill = () => (recommendations.length > 0 ? setConfirmRefill(true) : void refill())

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteVisitRequest(request.id)
      toast.success(t('visitRequest.deleted'))
      navigate(ROUTES.planVisitRequests)
    } catch {
      toast.error(t('visitRequest.decideFailed'))
      setDeleting(false)
    }
  }

  const recencyText = (stat: WardVisitStat | undefined) => {
    const r = wardRecency(stat, dayjs().format('YYYY-MM-DD'))
    if (r.tone === 'never') return t('recommend.toneNever')
    if (r.tone === 'fresh') return t('recommend.toneFresh')
    return t('recommend.toneStale', { months: Math.max(1, r.monthsSince ?? 0) })
  }

  return (
    <div className={styles.page}>
      <Link to={ROUTES.planVisitRequests} className={styles.back}>
        <ChevronLeft size={16} aria-hidden />
        {t('visitRequest.back')}
      </Link>

      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>{request.title}</h1>
          <div className={styles.headMeta}>
            <span>{request.seventyName}</span>
            {request.dueDate && (
              <span>{t('recommend.dueBy', { date: dayjs(request.dueDate).format(t('recommend.dateFormat')) })}</span>
            )}
            <Badge variant={request.status === 'open' ? 'success' : 'default'}>
              {request.status === 'open' ? t('visitRequest.statusOpen') : t('visitRequest.statusClosed')}
            </Badge>
          </div>
        </div>
        <div className={styles.headActions}>
          <Button variant="secondary" size="sm" loading={statusSaving} onClick={handleStatus}>
            {request.status === 'open' ? t('visitRequest.close') : t('visitRequest.reopen')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)}>
            {t('visitRequest.delete')}
          </Button>
        </div>
      </header>

      {/* 공유 — 요청을 만든 직후 가장 먼저 할 일 */}
      <Card>
        <CardHeader title={t('visitRequest.shareTitle')} />
        <CardBody>
          <p className={styles.hint}>{t('visitRequest.shareHint')}</p>
          <PlanBalance
            request={request}
            sundayStatus={sundayStatus}
            wardStats={wardStats}
            onRefill={handleRefill}
            refilling={refilling && !confirmRefill}
          />
          <StakeLinkList
            request={request}
            recommendations={recommendations}
            sundayStatus={sundayStatus}
            onCopy={handleCopy}
          />
        </CardBody>
      </Card>

      {/* 회장들이 보는 문구 — 강조 사항은 요청 중에도 바꿀 수 있다 */}
      <Card>
        <CardHeader
          title={t('visitRequest.textTitle')}
          action={
            !textDraft && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setTextDraft({ title: request.title, note: request.note ?? '', guidance: request.guidance ?? '' })
                }
              >
                {t('visitRequest.editText')}
              </Button>
            )
          }
        />
        <CardBody>
          {textDraft ? (
            <div className={styles.textForm}>
              <Input
                label={t('visitRequest.title')}
                value={textDraft.title}
                maxLength={80}
                onChange={(e) => setTextDraft({ ...textDraft, title: e.target.value })}
              />
              <GuidanceField
                value={textDraft.guidance}
                onChange={(guidance) => setTextDraft({ ...textDraft, guidance })}
              />
              <Textarea
                label={t('visitRequest.note')}
                value={textDraft.note}
                rows={3}
                onChange={(e) => setTextDraft({ ...textDraft, note: e.target.value })}
              />
              <div className={styles.shareActions}>
                <Button size="sm" loading={textSaving} disabled={!textDraft.title.trim()} onClick={handleSaveText}>
                  {t('visitRequest.saveText')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setTextDraft(null)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className={clsx(styles.guidanceText, !request.guidance && styles.hint)}>
                {request.guidance || t('visitRequest.guidanceNone')}
              </p>
              {request.note && <p className={styles.hint}>{request.note}</p>}
            </>
          )}
        </CardBody>
      </Card>

      <div className={styles.stats}>
        <StatCard
          label={t('visitRequest.statResponded')}
          value={progress.respondedUnits}
          unit={`/ ${progress.totalUnits}`}
        />
        <StatCard
          label={t('visitRequest.statDecided')}
          value={progress.decidedSundays}
          unit={`/ ${progress.totalSundays}`}
        />
      </div>

      <Card>
        <CardHeader title={t('visitRequest.boardTitle')} />
        <CardBody>
          <p className={styles.hint}>{t('visitRequest.boardHint')}</p>
          <ol className={styles.board}>
            {request.sundays.map((date) => (
              <SundayRow
                key={date}
                request={request}
                date={date}
                label={dateLabel(date)}
                special={
                  isGeneralConferenceSunday(date)
                    ? t('recommend.generalConferenceSunday')
                    : isFirstSunday(date)
                      ? t('recommend.fastSunday')
                      : null
                }
                status={sundayStatus[date]}
                candidates={rankCandidates(candidatesForSunday(recommendations, date), request.decisions ?? {})}
                unitName={(id) => unitById.get(id)?.ko ?? id}
                wardStats={wardStats}
                recencyText={recencyText}
                onDecide={(pick) => setPending({ date, pick })}
              />
            ))}
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('visitRequest.unitsTitle')} />
        <CardBody>
          <ul className={styles.unitList}>
            {request.units.map((u) => {
              const rec = recommendations.find((r) => r.unitId === u.id)
              return (
                <li key={u.id} className={styles.unitRow}>
                  <span className={styles.unitName}>{u.ko}</span>
                  {rec ? (
                    <span className={styles.unitMeta}>
                      <Check size={14} aria-hidden className={styles.unitCheck} />
                      {rec.submitterName} · {dayjs(rec.submittedAt).format('M.D HH:mm')} ·{' '}
                      {t('recommend.pickedCount', { count: rec.picks.length })}
                      {rec.note && <span className={styles.unitNote}>{rec.note}</span>}
                    </span>
                  ) : (
                    <span className={styles.unitPending}>{t('visitRequest.unitPending')}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </CardBody>
      </Card>

      <ConfirmSheet
        open={!!pending}
        tone={pending?.pick ? 'primary' : 'danger'}
        title={pending?.pick ? t('visitRequest.confirmDecideTitle') : t('visitRequest.confirmUndecideTitle')}
        message={
          pending
            ? pending.pick
              ? t('visitRequest.confirmDecideMessage', {
                  date: dateLabel(pending.date),
                  unit: pending.pick.unitName,
                  ward: pending.pick.wardName,
                })
              : t('visitRequest.confirmUndecideMessage', { date: dateLabel(pending.date) })
            : undefined
        }
        confirmLabel={pending?.pick ? t('visitRequest.decide') : t('visitRequest.undecide')}
        loading={deciding}
        onConfirm={handleDecide}
        onCancel={() => !deciding && setPending(null)}
      />
      <ConfirmSheet
        open={confirmRefill}
        title={t('visitRequest.balance.refill')}
        message={t('visitRequest.refillConfirmMessage', { count: recommendations.length })}
        confirmLabel={t('visitRequest.balance.refill')}
        loading={refilling}
        onConfirm={refill}
        onCancel={() => !refilling && setConfirmRefill(false)}
      />
      <ConfirmSheet
        open={showDelete}
        tone="danger"
        title={t('visitRequest.delete')}
        subject={request.title}
        confirmLabel={t('visitRequest.delete')}
        message={t('visitRequest.deleteMessage')}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setShowDelete(false)}
      />
    </div>
  )
}

function SundayRow({
  request,
  date,
  label,
  special,
  candidates,
  unitName,
  wardStats,
  recencyText,
  onDecide,
  status,
}: {
  status: SundayStatus | undefined
  request: VisitRequest
  date: string
  label: string
  special: string | null
  candidates: ReturnType<typeof rankCandidates>
  unitName: (id: string) => string
  wardStats: Record<string, WardVisitStat>
  recencyText: (s: WardVisitStat | undefined) => string
  onDecide: (pick: PendingDecision['pick']) => void
}) {
  const { t } = useTranslation()
  const decision = request.decisions?.[date]
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherUnit, setOtherUnit] = useState('')
  const [otherWard, setOtherWard] = useState('')
  // CC 차례가 정해진 일요일이면 그 CC의 단위만 — 회장들도 그 CC만 추천할 수 있었다.
  const turn = request.sundayRegions?.[date]
  const turnName = turn ? (request.regions?.find((r) => r.id === turn)?.name ?? turn) : null
  const turnColor = turn ? getRegionColor(turn) : null
  const turnUnits = turn ? request.units.filter((u) => !u.regionId || u.regionId === turn) : request.units
  const otherWards = useMemo(
    () => request.units.find((u) => u.id === otherUnit)?.wards ?? [],
    [request.units, otherUnit],
  )
  const today = dayjs().format('YYYY-MM-DD')
  // 이 일요일을 물어본 스테이크 — 추천이 아직 없을 때 누구를 기다리는지 보인다
  const asked = request.unitSundays
    ? request.units.filter((u) => request.unitSundays?.[u.id]?.includes(date))
    : []

  return (
    <li className={clsx(styles.sunday, decision && styles.sundayDecided)}>
      <div className={styles.sundayHead}>
        <span className={styles.sundayDate}>{label}</span>
        {special && <span className={styles.fast}>{special}</span>}
        {turnName && turnColor && (
          <span
            className={styles.regionTurn}
            style={{ background: turnColor.bg, color: turnColor.text, borderColor: turnColor.border }}
          >
            {t('visitRequest.boardRegion', { region: turnName })}
          </span>
        )}
        {decision && (
          <>
            <span className={styles.decidedText}>
              {t('visitRequest.decidedLabel')} · {unitName(decision.unitId)} {decision.wardName}
            </span>
            <Button variant="ghost" size="sm" onClick={() => onDecide(null)}>
              {t('visitRequest.undecide')}
            </Button>
          </>
        )}
      </div>

      {status?.councilRegionId && (
        <p className={styles.unitBlockLine}>
          {t('visitRequest.boardCouncil', {
            region: REGIONS.find((r) => r.id === status.councilRegionId)?.name ?? status.councilRegionId,
          })}
        </p>
      )}
      {status && status.busy.length > 0 && (
        <p className={styles.busyLine}>
          {t('visitRequest.boardBusy', {
            reasons: status.busy
              .map((b) => [t(`visitRequest.busyKind.${b.kind}`), b.label].filter(Boolean).join(' '))
              .join(', '),
          })}
        </p>
      )}
      {status && Object.keys(status.unitBlocks).length > 0 && (
        <p className={styles.unitBlockLine}>
          {t('visitRequest.boardUnitBlocks', {
            units: Object.entries(status.unitBlocks)
              .map(([id, title]) => (title ? `${unitName(id)}(${title})` : unitName(id)))
              .join(', '),
          })}
        </p>
      )}

      {candidates.length === 0 && !decision && (
        <p className={styles.noCandidates}>
          {asked.length > 0
            ? t('visitRequest.noCandidatesAsked', { units: asked.map((u) => u.ko).join(', ') })
            : t('visitRequest.noCandidates')}
        </p>
      )}

      {candidates.length > 0 && (
        <ul className={styles.candidates}>
          {candidates.map((c) => {
            const chosen = decision?.unitId === c.unitId && decision.wardId === c.wardId
            const stat = wardStats[c.wardId]
            const tone = wardRecency(stat, today).tone
            return (
              <li key={c.unitId} className={clsx(styles.candidate, chosen && styles.candidateChosen)}>
                <div className={styles.candText}>
                  <span className={styles.candWard}>
                    {unitName(c.unitId)} <strong>{c.wardName}</strong>
                  </span>
                  <span className={styles.candMeta}>
                    <span className={clsx(styles.tone, TONE_CLASS[tone])}>
                      {t('visitRequest.lastVisit', { recency: recencyText(stat) })}
                    </span>
                    {c.submitterName}
                  </span>
                </div>
                {chosen ? (
                  <Check size={18} aria-label={t('visitRequest.decidedLabel')} className={styles.chosenMark} />
                ) : (
                  <Button
                    size="sm"
                    variant={decision ? 'secondary' : 'primary'}
                    onClick={() =>
                      onDecide({
                        unitId: c.unitId,
                        wardId: c.wardId,
                        unitName: unitName(c.unitId),
                        wardName: c.wardName,
                      })
                    }
                  >
                    {t('visitRequest.decide')}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!otherOpen ? (
        <button type="button" className={styles.otherToggle} onClick={() => setOtherOpen(true)}>
          {t('visitRequest.pickOther')}
        </button>
      ) : (
        <div className={styles.otherForm}>
          <Select
            label={t('visitRequest.pickOtherUnit')}
            value={otherUnit}
            onChange={(e) => {
              setOtherUnit(e.target.value)
              setOtherWard('')
            }}
            options={turnUnits.map((u) => ({ value: u.id, label: u.ko }))}
          />
          <Select
            label={t('visitRequest.pickOtherWard')}
            value={otherWard}
            disabled={!otherUnit}
            onChange={(e) => setOtherWard(e.target.value)}
            options={otherWards.map((w) => ({
              value: w.id,
              label: `${w.ko} — ${recencyText(wardStats[w.id])}`,
            }))}
          />
          <Button
            size="sm"
            disabled={!otherUnit || !otherWard}
            onClick={() =>
              onDecide({
                unitId: otherUnit,
                wardId: otherWard,
                unitName: unitName(otherUnit),
                wardName: otherWards.find((w) => w.id === otherWard)?.ko ?? '',
              })
            }
          >
            {t('visitRequest.decide')}
          </Button>
        </div>
      )}
    </li>
  )
}
