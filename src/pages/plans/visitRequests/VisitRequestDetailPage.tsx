import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { ChevronLeft, Check } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { useVisitRequest } from '@/hooks/useVisitRequests'
import { authUserAtom } from '@/store/authAtom'
import { getShareSettings, setShareLang, setShareTemplate, type ShareSettings } from '@/services/userSettingsService'
import { useLeaders } from '@/hooks/useLeaders'
import type { ShareLang } from '@/utils/shareTemplate'
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
  translateVisitRequest,
  aiUnavailable,
} from '@/services/visitRequestService'
import { englishIsCurrent, englishSource, presidentsOfUnits } from '../../../../functions/src/requestEnglish'
import { hasStakePlan, recommendUnitSundays } from '../../../../functions/src/visitPlanBalance'
import { ROUTES } from '@/router/routes'
import {
  candidatesForSunday,
  GUIDANCE_MAX,
  monthSundays,
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
  // 요청 일요일이 든 달의 모든 일요일의 스테이크 막힘 — 그 달 스테이크 대회가 있는 스테이크를 추천에서 뒤로 민다
  const [monthUnitBlocks, setMonthUnitBlocks] = useState<Record<string, Record<string, string>>>({})
  const [statusLoad, setStatusLoad] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [pending, setPending] = useState<PendingDecision | null>(null)
  const [deciding, setDeciding] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [textDraft, setTextDraft] = useState<{ title: string; note: string; guidance: string } | null>(null)
  const [textSaving, setTextSaving] = useState(false)
  const [confirmRefill, setConfirmRefill] = useState(false)
  // 스테이크별 링크 보내기 설정(언어별 안내문, 스테이크별 언어) — 사람마다 하나, 모든 요청에 쓴다
  const authUser = useAtomValue(authUserAtom)
  const uid = authUser?.uid
  const [share, setShare] = useState<ShareSettings>({ templates: { ko: null, en: null }, langs: {} })
  useEffect(() => {
    if (!uid) return
    let cancelled = false
    getShareSettings(uid)
      .then((s) => !cancelled && setShare(s))
      .catch(() => {}) // 못 받으면 기본 안내문·한국어로 보낸다
    return () => {
      cancelled = true
    }
  }, [uid])
  const saveShareTemplates = async (next: Record<ShareLang, string | null>) => {
    if (!uid) return
    const changed = (['ko', 'en'] as const).filter((l) => next[l] !== share.templates[l])
    await Promise.all(changed.map((l) => setShareTemplate(uid, l, next[l])))
    setShare((prev) => ({ ...prev, templates: next }))
  }
  const changeShareLang = (unitId: string, lang: ShareLang) => {
    if (!uid) return
    const before = share.langs
    const langs = { ...before }
    if (lang === 'en') langs[unitId] = 'en'
    else delete langs[unitId]
    setShare((prev) => ({ ...prev, langs }))
    setShareLang(uid, unitId, lang).catch(() => {
      setShare((prev) => ({ ...prev, langs: before }))
      toast.error(t('visitRequest.shareTemplate.saveFailed'))
    })
  }
  // 안내문의 {회장} — 스테이크/지방부 회장 명단에서 이름을 찾는다
  const { leaders } = useLeaders()
  const presidents = useMemo(
    () => presidentsOfUnits(request?.units ?? [], leaders),
    [leaders, request?.units],
  )
  // 영어로 보내는 스테이크가 있으면 요청 값을 영어로 옮겨 둔다(원문이 바뀌면 다시). 요청마다 한 번만 묻는다.
  const englishSrc = useMemo(
    () => (request ? englishSource(request, presidents) : null),
    [request, presidents],
  )
  const english = englishSrc && englishIsCurrent(request?.english, englishSrc) ? request?.english ?? null : null
  const needsEnglish = !!request?.units.some((u) => share.langs[u.id] === 'en')
  const [englishPending, setEnglishPending] = useState(false)
  const askedEnglish = useRef<string | null>(null)
  useEffect(() => {
    if (!request || !englishSrc || !needsEnglish || english || !uid) return
    const key = `${request.id}:${JSON.stringify(englishSrc)}`
    if (askedEnglish.current === key) return
    askedEnglish.current = key
    setEnglishPending(true)
    translateVisitRequest(request.id)
      .catch((err) => {
        if (!aiUnavailable(err)) toast.error(t('visitRequest.englishFailed'))
      })
      .finally(() => setEnglishPending(false))
  }, [request, englishSrc, needsEnglish, english, uid, t])
  const [refilling, setRefilling] = useState(false)

  const reqId = request?.id
  const seventyUid = request?.seventyUid
  const sundaysKey = request?.sundays.join(',') ?? ''
  const decisionKey = request ? Object.keys(request.decisions ?? {}).sort().join(',') : ''
  useEffect(() => {
    if (!reqId || !seventyUid || !sundaysKey) return
    let cancelled = false
    // 일요일 상황과 와드 방문 기록(회장들이 보는 것과 같은 집계). 참고용이라 실패해도 화면은 그대로 쓴다.
    // 그 달의 다른 일요일(요청에 없는 날)도 함께 묻는다 — 스테이크 대회를 놓치지 않게.
    // 화면의 일요일 상황은 요청 일요일만 남긴다. 서버 한도(60)를 넘으면 요청 일요일만 묻는다.
    const requested = sundaysKey.split(',')
    const months = monthSundays(requested)
    const asked = months.length <= 60 ? [...new Set([...months, ...requested])].sort() : requested
    fetchSundayStatus(seventyUid, asked, reqId, { withWardStats: true })
      .then((s) => {
        if (cancelled) return
        setSundayStatus(Object.fromEntries(requested.filter((d) => s.status[d]).map((d) => [d, s.status[d]])))
        setMonthUnitBlocks(Object.fromEntries(Object.entries(s.status).map(([d, st]) => [d, st.unitBlocks])))
        setWardStats(s.wardStats ?? {})
        setStatusLoad('ready')
      })
      .catch(() => !cancelled && setStatusLoad('failed'))
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
      toast.error(t(next === 'closed' ? 'visitRequest.closeFailed' : 'visitRequest.reopenFailed'))
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
      // 요청에 없는 같은 달 일요일도 넘긴다 — 그 달에 스테이크 대회가 있는 스테이크를 뒤로 밀려고
      unitBlocks: monthUnitBlocks,
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
      toast.error(t('visitRequest.deleteFailed'))
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
        <dl className={styles.progress}>
          <div className={styles.progressItem}>
            <dt>{t('visitRequest.statResponded')}</dt>
            <dd>
              <strong>{progress.respondedUnits}</strong> / {progress.totalUnits}
            </dd>
          </div>
          <div className={styles.progressItem}>
            <dt>{t('visitRequest.statDecided')}</dt>
            <dd>
              <strong>{progress.decidedSundays}</strong> / {progress.totalSundays}
            </dd>
          </div>
        </dl>
        <div className={styles.headActions}>
          <Button variant="secondary" size="sm" loading={statusSaving} onClick={handleStatus}>
            {request.status === 'open' ? t('visitRequest.close') : t('visitRequest.reopen')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)}>
            {t('visitRequest.delete')}
          </Button>
        </div>
      </header>

      {/* 스테이크별 배정 — 분포를 보고, 칸을 눌러 고치고, 링크를 보낸다. 요청을 만든 직후 가장 먼저 할 일 */}
      <Card>
        <CardHeader title={t('visitRequest.shareTitle')} />
        <CardBody className={styles.assignBody}>
          <PlanBalance
            request={request}
            sundayStatus={sundayStatus}
            wardStats={wardStats}
            load={statusLoad}
            onRefill={handleRefill}
            refilling={refilling && !confirmRefill}
          >
            <StakeLinkList
              request={request}
              recommendations={recommendations}
              sundayStatus={sundayStatus}
              wardStats={wardStats}
              ready={statusLoad === 'ready'}
              onCopy={handleCopy}
              shareTemplates={share.templates}
              shareLangs={share.langs}
              presidents={presidents}
              english={english}
              englishPending={englishPending}
              onSaveTemplates={uid ? saveShareTemplates : undefined}
              onSetLang={uid ? changeShareLang : undefined}
            />
          </PlanBalance>
          <p className={styles.hint}>{t('visitRequest.shareHint')}</p>
        </CardBody>
      </Card>

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
            <div className={styles.textView}>
              <p className={clsx(styles.guidanceText, !request.guidance && styles.hint)}>
                {request.guidance || t('visitRequest.guidanceNone')}
              </p>
              {request.note && <p className={styles.hint}>{request.note}</p>}
            </div>
          )}
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
  const asked = hasStakePlan(request)
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
