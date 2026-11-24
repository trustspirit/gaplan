import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { authUserAtom } from '@/store/authAtom'
import { useUsers } from '@/hooks/useUsers'
import { useVisitRequests } from '@/hooks/useVisitRequests'
import { createVisitRequest, fetchSundayStatus } from '@/services/visitRequestService'
import { ROLE } from '@/constants/roles'
import { planVisitRequestDetailPath } from '@/router/routes'
import {
  isFirstSunday,
  isGeneralConferenceSunday,
  type BusyKind,
  type SundayStatus,
} from '../../../../functions/src/visitSundayAvailability'
import {
  consecutiveSameRegion,
  regionForNewSunday,
  rotateRegions,
} from '../../../../functions/src/visitRegionRotation'
import { REGIONS, getRegionColor } from '@/constants/regions'
import {
  GUIDANCE_PRESET_KEYS,
  quarterKey,
  quarterOf,
  quarterSundays,
  unitsSnapshotForRegions,
  upcomingQuarters,
  wardRecency,
  type Quarter,
} from '@/utils/visitRequest'
import { recommendUnitSundays } from '../../../../functions/src/visitPlanBalance'
import { GuidanceField } from './GuidanceField'
import { StakeTable } from './StakeTable'
import { planMatrix } from './stakeSundayMatrix'
import { unavailableReasons, unitBlockText } from './sundayReasons'
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/ui'
import type { AppUser, WardVisitStat } from '@/types'
import styles from './VisitRequestPanel.module.scss'

const QUARTER_CHOICES = 4
/** 일요일마다 먼저 가 볼 만한 와드를 몇 곳 보여 줄지 */
const WARD_PICKS_PER_SUNDAY = 3

/** 일요일이 막힌 이유들. 금식·연차 대회 주일은 서버 응답이 없어도(받기 전·빠진 날) 안다. */
function busyKindsOf(date: string, status: Record<string, SundayStatus>): BusyKind[] {
  const fromServer = status[date]?.busy.map((b) => b.kind)
  if (fromServer) return fromServer
  if (isGeneralConferenceSunday(date)) return ['generalConference']
  if (isFirstSunday(date)) return ['fast']
  return []
}

/** 오후 협의 평의회가 있는 일요일 → 그 CC. 담당 CC가 아니면 고정하지 않는다. */
function councilPinsOf(dates: string[], status: Record<string, SundayStatus>, regionIds: string[]) {
  const out: Record<string, string> = {}
  for (const d of dates) {
    const r = status[d]?.councilRegionId
    if (r && regionIds.includes(r)) out[d] = r
  }
  return out
}

function regionIdsOf(u: AppUser | undefined): string[] {
  if (!u) return []
  if (u.regionIds?.length) return u.regionIds
  return u.regionId ? [u.regionId] : []
}

export function VisitRequestPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()
  const { requests, loading, error } = useVisitRequests(user)

  const seventies = useMemo(() => users.filter((u) => u.role === ROLE.SEVENTY), [users])
  // 칠십인은 자기 자신, 집행서기는 담당 칠십인으로 고정된다. 관리자만 고른다.
  const fixedSeventyUid =
    user.role === ROLE.SEVENTY
      ? user.uid
      : user.role === ROLE.EXEC_SECRETARY
        ? (user.assignedSeventyUid ?? '')
        : null

  // 방문 계획은 보통 분기 단위 — 분기를 고르면 그 분기의 일요일이 펼쳐진다.
  // 이번 분기가 이미 진행 중이면 다음 분기를 먼저 고른다(보통 미리 계획한다).
  const quarters = useMemo(() => upcomingQuarters(QUARTER_CHOICES), [])
  const [quarter, setQuarter] = useState<Quarter>(() =>
    quarterKey(quarters[0]) === quarterKey(quarterOf(dayjs())) && quarters[1] ? quarters[1] : quarters[0],
  )
  const quarterLabel = (qt: Quarter) => t('visitRequest.quarterLabel', { year: qt.year, q: qt.q })
  const [title, setTitle] = useState('')
  // 제목을 손대지 않았으면 고른 분기로 채운다.
  const [titleTouched, setTitleTouched] = useState(false)
  const [pickedSeventy, setPickedSeventy] = useState('')
  const [sundays, setSundays] = useState<string[]>([])
  // CC를 둘 이상 맡았으면 일요일마다 차례인 CC — 한 CC를 연달아 방문하지 않도록.
  const [sundayRegions, setSundayRegions] = useState<Record<string, string>>({})
  // 첫 일요일 전 마지막 와드 방문의 CC
  const [lastRegion, setLastRegion] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  // 기본으로 가장 흔한 강조(오래 방문받지 못한 와드)를 넣어 둔다 — 지우면 강조 없이 보낸다.
  const [guidance, setGuidance] = useState(() => t(GUIDANCE_PRESET_KEYS[0]))
  const [creating, setCreating] = useState(false)

  const seventyUid = fixedSeventyUid ?? pickedSeventy
  const seventy =
    seventyUid === user.uid ? user : seventies.find((s) => s.uid === seventyUid)
  const regionIds = regionIdsOf(seventy)
  const regionKey = regionIds.join(',')
  const offered = useMemo(() => quarterSundays(quarter), [quarter])
  const titleValue = titleTouched ? title : t('visitRequest.quarterTitle', { year: quarter.year, q: quarter.q })

  // 칠십인 기준으로 비어 있는 일요일만 고를 수 있게, 일요일마다 일정·참석 행사·막은 날을 받아 온다.
  const [status, setStatus] = useState<Record<string, SundayStatus>>({})
  const [statusState, setStatusState] = useState<'idle' | 'loading' | 'error'>('idle')
  // 담당 CC 와드의 방문 기록 — 일요일마다 우선 방문할 와드를 함께 보여 준다
  const [wardStats, setWardStats] = useState<Record<string, WardVisitStat> | null>(null)
  useEffect(() => {
    if (!seventyUid) {
      setStatus({})
      setStatusState('idle')
      return
    }
    let cancelled = false
    setStatusState('loading')
    setSundays([])
    setSundayRegions({})
    setWardStats(null)
    const rotation = regionKey.split(',').filter(Boolean)
    fetchSundayStatus(seventyUid, offered, undefined, { withWardStats: true })
      .then(({ status: st, lastVisitRegion, wardStats: ws }) => {
        if (cancelled) return
        setStatus(st)
        setWardStats(ws ?? null)
        setLastRegion(lastVisitRegion)
        setStatusState('idle')
        // 분기의 빈 일요일을 모두 골라 둔다 — 보통은 그대로 두고 몇 개만 뺀다.
        // 분기·칠십인을 바꾸면 그 기준으로 다시 고른다.
        const free = offered.filter((d) => busyKindsOf(d, st).length === 0)
        setSundays(free)
        // 바로 앞 방문의 CC로는 시작하지 않는다 — 분기 경계에서도 번갈아 가게.
        setSundayRegions(
          rotation.length > 1
            ? rotateRegions(free, rotation, lastVisitRegion, councilPinsOf(free, st, rotation))
            : {},
        )
      })
      .catch(() => !cancelled && setStatusState('error'))
    return () => {
      cancelled = true
    }
  }, [seventyUid, offered, regionKey])

  const busyKinds = (date: string) => busyKindsOf(date, status)
  const snapshotUnits = useMemo(() => unitsSnapshotForRegions(regionIds), [regionIds])

  const unitName = (id: string) => snapshotUnits.find((u) => u.id === id)?.ko ?? id
  // 고를 수 없는 일요일과 일부 스테이크만 빠지는 일요일 — 칩 아래에 이유를 적어 둔다(툴팁은 모바일에서 안 보인다).
  const skipped = offered.flatMap((date) => {
    const st = status[date]
    const reasons = unavailableReasons(date, st, t)
    if (reasons.length > 0) return [{ date, text: reasons.join(' / '), partial: false }]
    const partial = unitBlockText(st, unitName)
    return partial ? [{ date, text: t('visitRequest.boardUnitBlocks', { units: partial }), partial: true }] : []
  })

  const multiRegion = regionIds.length > 1
  // 협의 평의회 날은 그 CC로 고정 — 이동하기 쉽게 그 CC 와드를 방문한다.
  const pins = councilPinsOf(offered, status, regionIds)
  const regionName = (id: string) => REGIONS.find((r) => r.id === id)?.name ?? id
  const regionShort = (id: string) => regionName(id).replace(/\s*CC$/, '')

  const toggleSunday = (date: string) => {
    if (sundays.includes(date)) {
      setSundays(sundays.filter((d) => d !== date))
      const rest = { ...sundayRegions }
      delete rest[date]
      setSundayRegions(rest)
      return
    }
    setSundays([...sundays, date])
    if (multiRegion) {
      setSundayRegions({
        ...sundayRegions,
        [date]: pins[date] ?? regionForNewSunday(date, sundayRegions, regionIds),
      })
    }
  }
  const cycleRegion = (date: string) => {
    const i = regionIds.indexOf(sundayRegions[date])
    setSundayRegions({ ...sundayRegions, [date]: regionIds[(i + 1) % regionIds.length] })
  }
  const selectAllFree = () => {
    const free = offered.filter((d) => busyKinds(d).length === 0)
    setSundays(free)
    setSundayRegions(multiRegion ? rotateRegions(free, regionIds, lastRegion, pins) : {})
  }
  const reRotate = () => setSundayRegions(rotateRegions(sundays, regionIds, lastRegion, pins))
  const clearSundays = () => {
    setSundays([])
    setSundayRegions({})
  }
  // 고른 일요일마다 1순위·예비 스테이크와 그날 CC에서 방문 우선순위가 높은 와드/지부.
  // 방문 기록을 못 받아도 배정은 만든다(기록 없음으로 본다) — 목록만 기록이 있을 때 보인다.
  const plan = useMemo(
    () =>
      recommendUnitSundays({
        sundays: [...sundays].sort(),
        request: {
          units: snapshotUnits,
          sundayRegions: multiRegion ? sundayRegions : undefined,
        },
        wardStats: wardStats ?? {},
        unitBlocks: Object.fromEntries(sundays.map((d) => [d, status[d]?.unitBlocks ?? {}])),
        perSunday: WARD_PICKS_PER_SUNDAY,
      }),
    [sundays, snapshotUnits, multiRegion, sundayRegions, wardStats, status],
  )
  const wardPicks = wardStats ? plan.picks : null
  // 스테이크 × 일요일 표 — 만들기 전에 분포를 한눈에
  const matrix = useMemo(
    () =>
      planMatrix({
        request: {
          sundays,
          units: snapshotUnits,
          sundayRegions: multiRegion ? sundayRegions : undefined,
          unitSundays: plan.unitSundays,
        },
        roles: plan.roles,
        status,
        wardStats: wardStats ?? {},
      }),
    [sundays, snapshotUnits, multiRegion, sundayRegions, plan, status, wardStats],
  )
  const today = dayjs().format('YYYY-MM-DD')
  const recencyText = (lastVisit: string | null) => {
    const r = wardRecency({ lastVisit }, today)
    if (r.tone === 'never') return t('recommend.toneNever')
    if (r.tone === 'fresh') return t('recommend.toneFresh')
    return t('recommend.toneStale', { months: Math.max(1, r.monthsSince ?? 0) })
  }

  // 같은 CC가 연달아 붙은 일요일 — 칠십인이 CC를 바꾸다 생길 수 있다.
  const repeated = new Set(multiRegion ? consecutiveSameRegion(sundayRegions) : [])

  const canCreate =
    !!titleValue.trim() && !!seventyUid && !!seventy && regionIds.length > 0 && sundays.length > 0

  const handleCreate = async () => {
    if (!canCreate || !seventy) return
    setCreating(true)
    try {
      const id = await createVisitRequest(
        {
          title: titleValue.trim(),
          note: note.trim(),
          guidance: guidance.trim(),
          seventyUid,
          seventyName: seventy.name,
          sundays,
          ...(multiRegion
            ? {
                sundayRegions: Object.fromEntries(sundays.map((d) => [d, sundayRegions[d]])),
                regions: regionIds.map((id) => ({ id, name: regionName(id) })),
              }
            : {}),
          dueDate: dueDate || null,
          units: unitsSnapshotForRegions(regionIds),
          unitSundays: plan.unitSundays,
          unitSundayRoles: plan.roles,
        },
        user.uid,
      )
      navigate(planVisitRequestDetailPath(id))
    } catch {
      toast.error(t('visitRequest.createFailed'))
      setCreating(false)
    }
  }


  return (
    <div className={styles.panel}>
      <Card>
        <CardHeader title={t('visitRequest.newTitle')} />
        <CardBody>
          <p className={styles.hint}>{t('visitRequest.newHint')}</p>
          {/* 넓은 화면: 위에 기본 정보 한 줄, 가운데 일요일 고르기 | 배정 미리보기, 아래 문구 두 칸. 좁은 화면은 위에서 아래로. */}
          <div className={styles.create}>
            <div className={styles.fieldsRow}>
              <Input
                label={t('visitRequest.title')}
                value={titleValue}
                placeholder={t('visitRequest.titlePlaceholder')}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setTitleTouched(true)
                }}
              />
              {fixedSeventyUid === null && (
                <Select
                  label={t('visitRequest.seventy')}
                  value={pickedSeventy}
                  onChange={(e) => setPickedSeventy(e.target.value)}
                  options={seventies.map((s) => ({ value: s.uid, label: s.name }))}
                />
              )}
              <Input
                type="date"
                label={t('visitRequest.dueDate')}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            {fixedSeventyUid === '' && (
              <p className={styles.warn} role="alert">
                {t('visitRequest.noSeventy')}
              </p>
            )}
            {seventy && regionIds.length === 0 && (
              <p className={styles.warn} role="alert">
                {t('visitRequest.noRegion')}
              </p>
            )}

            <div className={styles.planRow}>
              <fieldset className={styles.sundayField}>
                <legend className={styles.legend}>
                  {t('visitRequest.sundays')}
                  <span className={styles.count}>
                    {t('visitRequest.sundaysHint', { count: sundays.length })}
                  </span>
                </legend>
                <div className={styles.quarters} role="radiogroup" aria-label={t('visitRequest.quarter')}>
                  {quarters.map((qt) => {
                    const on = quarterKey(qt) === quarterKey(quarter)
                    return (
                      <button
                        key={quarterKey(qt)}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={clsx(styles.quarterBtn, on && styles.quarterBtnOn)}
                        onClick={() => setQuarter(qt)}
                      >
                        {quarterLabel(qt)}
                      </button>
                    )
                  })}
                </div>
                <div className={styles.monthRows}>
                  {[...new Set(offered.map((d) => d.slice(0, 7)))].map((month) => (
                    <div key={month} className={styles.monthRow}>
                      <span className={styles.month}>{dayjs(`${month}-01`).format(t('visitRequest.monthFormat'))}</span>
                      <div className={styles.sundayGrid}>
                        {offered.filter((d) => d.startsWith(month)).map((date) => {
                    const d = dayjs(date)
                    const on = sundays.includes(date)
                    const kinds = busyKinds(date)
                    const st = status[date]
                    const partial = unitBlockText(st, unitName)
                    const reasons = [
                      ...unavailableReasons(date, st, t),
                      ...(partial ? [t('visitRequest.boardUnitBlocks', { units: partial })] : []),
                    ]
                    const region = on && multiRegion ? sundayRegions[date] : undefined
                    const regionColor = region ? getRegionColor(region) : null
                    return (
                      <span key={date} className={clsx(styles.sundayCell, multiRegion && styles.sundayCellStack)}>
                        <button
                          type="button"
                          aria-pressed={on}
                          disabled={kinds.length > 0}
                          title={reasons.join(' / ') || undefined}
                          className={clsx(
                            styles.sundayChip,
                            on && styles.sundayChipOn,
                            kinds.length > 0 && styles.sundayChipBusy,
                            st && Object.keys(st.unitBlocks).length > 0 && styles.sundayChipPartial,
                          )}
                          onClick={() => toggleSunday(date)}
                        >
                          <span className={styles.chipDay}>{d.format('D')}</span>
                          {kinds.length > 0 && (
                            <span className={styles.chipFast}>{t(`visitRequest.busyKind.${kinds[0]}`)}</span>
                          )}
                          {kinds.length === 0 && st?.councilRegionId && (
                            <span className={styles.chipFast}>{t('visitRequest.councilShort')}</span>
                          )}
                        </button>
                        {region && regionColor && pins[date] === region && (
                          <span
                            className={styles.regionTag}
                            style={{ background: regionColor.bg, color: regionColor.text, borderColor: regionColor.border }}
                            title={t('visitRequest.councilPinned', { region: regionName(region) })}
                          >
                            {regionShort(region)}
                          </span>
                        )}
                        {region && regionColor && pins[date] !== region && (
                          <button
                            type="button"
                            className={clsx(styles.regionTag, repeated.has(date) && styles.regionTagRepeat)}
                            style={{ background: regionColor.bg, color: regionColor.text, borderColor: regionColor.border }}
                            aria-label={t('visitRequest.regionSwitch', { date: d.format('M/D'), region: regionName(region) })}
                            onClick={() => cycleRegion(date)}
                          >
                            {regionShort(region)}
                          </button>
                        )}
                        {multiRegion && !region && <span className={styles.regionTagSpace} aria-hidden />}
                      </span>
                    )
                  })}
                      </div>
                    </div>
                  ))}
                </div>
                {skipped.length > 0 && (
                  <div className={styles.reasons}>
                    <p className={styles.reasonsTitle}>{t('visitRequest.reasonTitle')}</p>
                    <ul className={styles.reasonList}>
                      {skipped.map((r) => (
                        <li key={r.date} className={clsx(r.partial && styles.reasonPartial)}>
                          <span className={styles.reasonDate}>{dayjs(r.date).format(t('visitRequest.reasonDateFormat'))}</span>
                          <span>{r.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className={styles.sundayHint}>
                  {statusState === 'loading'
                    ? t('visitRequest.sundayLoading')
                    : statusState === 'error'
                      ? t('visitRequest.sundayLoadFailed')
                      : t('visitRequest.sundaysFreeHint')}
                </p>
                {multiRegion && sundays.length > 0 && (
                  <div className={styles.regionSummary}>
                    <p className={styles.sundayHint}>
                      {t('visitRequest.regionHint')}{' '}
                      {lastRegion && `${t('visitRequest.regionLast', { region: regionName(lastRegion) })} `}
                      {Object.keys(pins).some((d) => sundays.includes(d)) && `${t('visitRequest.councilHint')} `}
                      {regionIds
                        .map((id) => `${regionShort(id)} ${sundays.filter((d) => sundayRegions[d] === id).length}`)
                        .join(' · ')}
                    </p>
                    {repeated.size > 0 && (
                      <p className={styles.warn} role="alert">
                        {t('visitRequest.regionRepeat', {
                          dates: [...repeated].map((d) => dayjs(d).format('M/D')).join(', '),
                        })}
                      </p>
                    )}
                  </div>
                )}
                <div className={styles.sundayActions}>
                  <Button variant="secondary" size="sm" disabled={!seventyUid} onClick={selectAllFree}>
                    {t('visitRequest.selectAllFree')}
                  </Button>
                  {multiRegion && sundays.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={reRotate}>
                      {t('visitRequest.regionRotate')}
                    </Button>
                  )}
                  {sundays.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearSundays}>
                      {t('visitRequest.clearSundays')}
                    </Button>
                  )}
                </div>
              </fieldset>
              <section
                className={clsx(styles.preview, !(wardPicks && sundays.length > 0) && styles.previewIdle)}
                aria-label={t('visitRequest.picksTitle')}
              >
                {wardPicks && sundays.length > 0 ? (
                  <>
                    <h3 className={styles.previewTitle}>{t('visitRequest.picksTitle')}</h3>
                    <StakeTable matrix={matrix} today={today} />
                    <p className={styles.picksHint}>{t('visitRequest.picksHint')}</p>
                    <ul className={styles.pickList}>
                      {[...sundays].sort().map((date) => {
                        const region = multiRegion ? sundayRegions[date] : undefined
                        const regionColor = region ? getRegionColor(region) : null
                        const picks = wardPicks[date] ?? []
                        const roles = plan.roles[date]
                        return (
                          <li key={date} className={styles.pickRow}>
                            <span className={styles.pickDate}>
                              {dayjs(date).format(t('visitRequest.reasonDateFormat'))}
                              {region && regionColor && (
                                <span
                                  className={styles.pickRegion}
                                  style={{ background: regionColor.bg, color: regionColor.text, borderColor: regionColor.border }}
                                >
                                  {regionShort(region)}
                                </span>
                              )}
                            </span>
                            <div className={styles.pickBody}>
                              {roles?.primary && (
                                <span className={styles.pickRoles}>
                                  {t('visitRequest.pickRoles', {
                                    primary: unitName(roles.primary),
                                    backup: roles.backup ? unitName(roles.backup) : t('visitRequest.pickRolesNoBackup'),
                                  })}
                                </span>
                              )}
                              {picks.length === 0 ? (
                                <span className={styles.pickNone}>{t('visitRequest.picksNone')}</span>
                              ) : (
                                <ol className={styles.pickWards}>
                                  {picks.map((p) => {
                                    const tone = wardRecency({ lastVisit: p.lastVisit }, today).tone
                                    return (
                                      <li key={p.wardId} className={styles.pickWard}>
                                        <span className={styles.pickWardName}>{p.wardName}</span>
                                        <span className={styles.pickUnit}>{p.unitName}</span>
                                        <span className={clsx(styles.pickRecency, tone === 'fresh' ? styles.toneFresh : tone === 'aging' ? styles.toneAging : styles.toneStale)}>
                                          {recencyText(p.lastVisit)}
                                        </span>
                                      </li>
                                    )
                                  })}
                                </ol>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                ) : (
                  <p className={styles.previewEmpty}>
                    {statusState === 'loading' ? t('visitRequest.sundayLoading') : t('visitRequest.picksEmpty')}
                  </p>
                )}
              </section>
            </div>

            <div className={styles.textRow}>
              <GuidanceField value={guidance} onChange={setGuidance} />
              <Textarea
                label={t('visitRequest.note')}
                value={note}
                rows={3}
                placeholder={t('visitRequest.notePlaceholder')}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className={styles.createFoot}>
              <Button onClick={handleCreate} loading={creating} disabled={!canCreate}>
                {t('visitRequest.create')}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('visitRequest.listTitle')} />
        <CardBody>
          {loading && <LoadingState shape="list" rows={3} />}
          {!loading && error && <ErrorState title={t('visitRequest.loadFailed')} />}
          {!loading && !error && requests.length === 0 && (
            <EmptyState title={t('visitRequest.empty')} />
          )}
          {!loading && !error && requests.length > 0 && (
            <div className={styles.rows}>
              {requests.map((r) => {
                const decided = r.sundays.filter((d) => r.decisions?.[d]).length
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={styles.row}
                    onClick={() => navigate(planVisitRequestDetailPath(r.id))}
                  >
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{r.title}</span>
                      <span className={styles.rowMeta}>
                        {r.seventyName} ·{' '}
                        {t('visitRequest.progress', {
                          responded: r.respondedUnitIds?.length ?? 0,
                          units: r.units.length,
                          decided,
                          sundays: r.sundays.length,
                        })}
                      </span>
                    </span>
                    <Badge variant={r.status === 'open' ? 'success' : 'default'}>
                      {r.status === 'open'
                        ? t('visitRequest.statusOpen')
                        : t('visitRequest.statusClosed')}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
