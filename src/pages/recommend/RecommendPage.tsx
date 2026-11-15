import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { CalendarDays, ChevronDown, ChevronRight, Info, List, ShieldCheck } from 'lucide-react'
import type { HttpsCallable } from 'firebase/functions'
import { publicCallable } from '@/services/publicFunctions'
import { wardRecency, type RecencyTone } from '@/utils/visitRequest'
import type { PublicVisitRequest, VisitRequestUnit, WardVisitStat } from '@/types'
import { RecommendCalendar, type SundayCellState } from './RecommendCalendar'
import { WardPicker } from './WardPicker'
import styles from './RecommendPage.module.scss'

interface SubmitRequest {
  requestId: string
  token: string
  unitId: string
  submitterName: string
  note?: string   // 안 보내면 서버가 예전 메모를 그대로 둔다
  picks: { date: string; wardId: string }[]
}

type GetRequest = { requestId: string; token: string }
let getFn: HttpsCallable<GetRequest, PublicVisitRequest> | null = null
let submitFn: HttpsCallable<SubmitRequest, { success: boolean }> | null = null
const getRequest = () =>
  (getFn ??= publicCallable<GetRequest, PublicVisitRequest>('getVisitRequestPublic'))
const submitRecommendation = () =>
  (submitFn ??= publicCallable<SubmitRequest, { success: boolean }>('submitVisitRecommendation'))

// 같은 휴대폰으로 다시 열면 고른 단위와 이름을 그대로 둔다. 저장소가 막혀 있어도 페이지는 돌아야 한다.
function readStored(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}
function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* 사생활 보호 모드 등 */
  }
}

function removeStored(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* 사생활 보호 모드 등 */
  }
}

function unitFromUrl(): string {
  return new URLSearchParams(window.location.search).get('unit') ?? ''
}

function urlWithUnit(unitId: string): string {
  const params = new URLSearchParams(window.location.search)
  if (unitId) params.set('unit', unitId)
  else params.delete('unit')
  const q = params.toString()
  return `${window.location.pathname}${q ? `?${q}` : ''}`
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; invalid: boolean }
  | { kind: 'ready'; data: PublicVisitRequest }

export default function RecommendPage({
  requestId,
  token,
}: {
  requestId: string | undefined
  token: string | undefined
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ko'
  const today = dayjs().format('YYYY-MM-DD')

  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  // 고른 단위는 주소(?unit=)에도 싣는다 — 휴대폰 뒤로 가기가 단위 선택 화면으로 돌아가게.
  // 주소에 없으면 이 휴대폰에서 지난번에 고른 단위로 바로 들어간다.
  const [unitId, setUnitId] = useState(
    () => unitFromUrl() || (requestId ? readStored(`recommendUnit:${requestId}`) : ''),
  )
  const [picks, setPicks] = useState<Record<string, string>>({}) // date -> wardId
  const [name, setName] = useState(() => readStored('recommendName'))
  const [note, setNote] = useState('')
  // 메모는 공개 응답에 오지 않는다. 손대지 않았으면 보내지 않아 예전 메모를 지키고, 적었으면 바꾼다.
  const [noteTouched, setNoteTouched] = useState(false)
  // 이 단위의 저장된 추천으로 칸을 채웠는가. 다시 받아 올 때마다 채우면 고치던 선택이 날아간다.
  const prefilledFor = useRef<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [sent, setSent] = useState<{ date: string; wardId: string }[]>([])
  // 좁은 화면에서만 쓰는 보기 전환. 넓은 화면은 달력과 목록을 나란히 둔다(CSS).
  const [view, setView] = useState<'list' | 'calendar'>('list')
  // 목록에서 와드 고르는 칸은 한 번에 하나만 펼친다.
  const [openDate, setOpenDate] = useState<string | null>(null)

  useEffect(() => {
    const saved = readStored('publicLang')
    if (saved && saved !== i18n.language) i18n.changeLanguage(saved)
  }, [i18n])

  useEffect(() => {
    if (!token || !requestId) {
      setState({ kind: 'error', invalid: true })
      return
    }
    let cancelled = false
    // 다시 받을 때(제출 뒤 새로고침)는 화면을 비우지 않는다.
    setState((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }))
    getRequest()({ requestId, token })
      .then((res) => !cancelled && setState({ kind: 'ready', data: res.data }))
      .catch((err: { code?: string }) => {
        if (cancelled) return
        setState({ kind: 'error', invalid: err?.code === 'functions/permission-denied' })
      })
    return () => {
      cancelled = true
    }
  }, [requestId, token, reloadKey])

  const data = state.kind === 'ready' ? state.data : null
  const unit = data?.units.find((u) => u.id === unitId) ?? null
  const myRec = data?.recommendations.find((r) => r.unitId === unitId) ?? null

  // 단위를 고르면 그 단위가 이미 낸 추천으로 채운다 — 다시 연 회장은 고칠 것만 고치면 된다.
  const loadUnit = useCallback(
    (id: string, source: PublicVisitRequest) => {
      const rec = source.recommendations.find((r) => r.unitId === id)
      setPicks(Object.fromEntries((rec?.picks ?? []).map((p) => [p.date, p.wardId])))
      setNote('')
      setNoteTouched(false)
      if (rec?.submitterName) setName(rec.submitterName)
      prefilledFor.current = id
    },
    [],
  )

  // 저장해 둔 단위로 다시 연 경우, 처음 받은 데이터로 한 번만 채운다.
  useEffect(() => {
    if (data && unitId && prefilledFor.current !== unitId && data.units.some((u) => u.id === unitId)) {
      loadUnit(unitId, data)
    }
  }, [data, unitId, loadUnit])

  // 뒤로 가기: 주소의 단위를 따라간다(선택 화면으로 돌아가거나 다시 앞으로).
  useEffect(() => {
    const onPop = () => {
      const id = unitFromUrl()
      setUnitId(id)
      setSubmitError(null)
      if (id && data) loadUnit(id, data)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [data, loadUnit])

  const chooseUnit = (id: string) => {
    if (!data) return
    setUnitId(id)
    if (requestId) writeStored(`recommendUnit:${requestId}`, id)
    loadUnit(id, data)
    setSubmitError(null)
    window.history.pushState({ recommendUnit: id }, '', urlWithUnit(id))
  }

  // 저장하지 않은 수정이 있는가 — 단위를 바꾸면 그 수정은 버려진다.
  const isDirty = () => {
    const rec = data?.recommendations.find((r) => r.unitId === unitId)
    const saved = Object.fromEntries((rec?.picks ?? []).map((p) => [p.date, p.wardId]))
    const now = Object.fromEntries(Object.entries(picks).filter(([, w]) => w))
    return noteTouched || JSON.stringify(Object.entries(saved).sort()) !== JSON.stringify(Object.entries(now).sort())
  }

  const leaveUnit = () => {
    if (isDirty() && !window.confirm(t('recommend.changeUnitConfirm'))) return
    if (requestId) removeStored(`recommendUnit:${requestId}`)
    setSubmitError(null)
    setDone(false)
    // 선택 화면에서 들어왔으면 그 기록으로 돌아간다. 저장된 단위로 바로 열렸으면 주소만 고친다.
    if ((window.history.state as { recommendUnit?: string } | null)?.recommendUnit) {
      window.history.back()
    } else {
      setUnitId('')
      window.history.replaceState(null, '', urlWithUnit(''))
    }
  }

  const toggleLang = () => {
    const next = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(next)
    writeStored('publicLang', next)
  }

  const unitName = (u: Pick<VisitRequestUnit, 'ko' | 'en'> | undefined) => (u ? u[lang] : '')
  const wardLabel = (u: VisitRequestUnit, wardId: string) =>
    u.wards.find((w) => w.id === wardId)?.[lang] ?? ''

  const recencyText = (stat: WardVisitStat | undefined) => {
    const r = wardRecency(stat, today)
    if (r.tone === 'never') return t('recommend.toneNever')
    if (r.tone === 'fresh') return t('recommend.toneFresh')
    return t(r.tone === 'aging' ? 'recommend.toneAging' : 'recommend.toneStale', {
      months: Math.max(1, r.monthsSince ?? 0),
    })
  }

  // 다른 단위로 확정된 일요일은 보낼 수 없으니 세지도 않는다.
  const pickedDates = useMemo(
    () =>
      Object.entries(picks)
        .filter(([d, w]) => {
          if (!w) return false
          const decision = data?.decisions[d]
          if (decision) return decision.unitId === unitId
          // 칠십인이 못 오는 날·우리 단위 행사가 있는 날은 보내지 않는다(서버도 거절한다).
          const st = data?.sundayStatus?.[d]
          return !st || (st.busy.length === 0 && !(unitId in st.unitBlocks))
        })
        .map(([d]) => d)
        .sort(),
    [picks, data, unitId],
  )

  const cells = data && unit ? sundayCells(data, unit, picks, lang, t) : {}
  // 이 단위와 관련 있는 공개 행사만 — 다른 스테이크 대회는 이 회장에게 소음이다.
  const unitEvents = (data?.calendarEvents ?? []).filter(
    (e) => !e.unitIds || (!!unit && e.unitIds.includes(unit.id)),
  )

  const handleSubmit = async () => {
    if (!token || !requestId || !unit || !data) return
    if (!name.trim()) {
      setSubmitError(t('recommend.nameRequired'))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = pickedDates.map((date) => ({ date, wardId: picks[date] }))
      await submitRecommendation()({
        requestId,
        token,
        unitId: unit.id,
        submitterName: name.trim(),
        ...(noteTouched ? { note: note.trim() } : {}),
        picks: payload,
      })
      setSent(payload)
      writeStored('recommendName', name.trim())
      setDone(true)
      setReloadKey((k) => k + 1) // 다른 회장들의 추천·확정을 새로 받아 둔다
    } catch {
      // 서버 메시지는 영어 진단용이다. 그사이 마감·확정됐을 수 있으니 최신 상태를 다시 받는다.
      setSubmitError(t('recommend.submitFailed'))
      setReloadKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  // 단위를 고른 화면은 넓은 화면에서 두 단으로 펼친다 — 머리글도 같은 폭에 맞춘다.
  const wide = state.kind === 'ready' && !done && state.data.units.some((u) => u.id === unitId)
  const header = (
    <header className={clsx(styles.header, wide && styles.headerWide)}>
      <button type="button" className={styles.langToggle} onClick={toggleLang}>
        {i18n.language === 'ko' ? 'EN' : '한'}
      </button>
      <div className={styles.kicker}>{t('recommend.kicker')}</div>
      {data && <h1 className={styles.title}>{data.title}</h1>}
      {data && (
        <div className={styles.meta}>
          {data.seventyName && <span>{t('recommend.seventyBy', { name: data.seventyName })}</span>}
          {data.dueDate && (
            <span className={styles.due}>
              {t('recommend.dueBy', { date: dayjs(data.dueDate).format(t('recommend.dateFormat')) })}
            </span>
          )}
        </div>
      )}
    </header>
  )

  if (state.kind === 'loading') {
    return (
      <div className={styles.page}>
        {header}
        <div className={styles.loading}>{t('recommend.loading')}</div>
      </div>
    )
  }

  if (state.kind === 'error' || !data) {
    const invalid = state.kind === 'error' && state.invalid
    return (
      <div className={styles.page}>
        {header}
        <main className={styles.content}>
          <div className={styles.errorBanner} role="alert">
            {invalid ? t('recommend.invalidLink') : t('recommend.loadFailed')}
          </div>
          {!invalid && (
            <button type="button" className={styles.secondaryBtn} onClick={() => setReloadKey((k) => k + 1)}>
              {t('common.retry')}
            </button>
          )}
        </main>
      </div>
    )
  }

  const isOpen = data.status === 'open'

  if (done && unit) {
    return (
      <div className={styles.page}>
        {header}
        <main className={styles.content}>
          <section className={styles.doneCard} aria-live="polite">
            <h2 className={styles.doneTitle}>{t('recommend.doneTitle')}</h2>
            <p className={styles.doneSub}>{t('recommend.doneSub')}</p>
            {sent.length === 0 ? (
              <p className={styles.doneSub}>{t('recommend.doneEmpty')}</p>
            ) : (
              <ul className={styles.doneList}>
                {sent.map((p) => (
                  <li key={p.date}>
                    <span className={styles.doneDate}>{dayjs(p.date).format(t('recommend.dateFormat'))}</span>
                    <span>{wardLabel(unit, p.wardId)}</span>
                  </li>
                ))}
              </ul>
            )}
            {isOpen && (
              <button type="button" className={styles.secondaryBtn} onClick={() => setDone(false)}>
                {t('recommend.edit')}
              </button>
            )}
            <button type="button" className={styles.linkBtn} onClick={leaveUnit}>
              {t('recommend.otherUnit')}
            </button>
          </section>
        </main>
      </div>
    )
  }

  const guidanceBox = data.guidance ? (
    <aside className={styles.guidance} aria-label={t('recommend.guidanceTitle')}>
      <Info size={18} aria-hidden className={styles.guidanceIcon} />
      <p className={styles.guidanceText}>{data.guidance}</p>
    </aside>
  ) : null

  const submittedUnits = new Map(data.recommendations.map((r) => [r.unitId, r]))

  // 들어오는 첫 화면: 단위만 고른다. 고르기 전에는 다른 것을 보여 주지 않는다.
  if (!unit) {
    return (
      <div className={styles.page}>
        {header}
        <main className={styles.content}>
          {guidanceBox}
          {data.note && <p className={styles.note}>{data.note}</p>}
          {!isOpen && <div className={styles.closedBanner}>{t('recommend.closedBanner')}</div>}
          <section className={styles.section} aria-labelledby="rec-gate">
            <h2 id="rec-gate" className={styles.gateTitle}>
              {t('recommend.gateTitle')}
            </h2>
            <p className={styles.stepHint}>{t('recommend.gateHint')}</p>
            <ul className={styles.unitList} aria-labelledby="rec-gate">
              {data.units.map((u) => {
                const rec = submittedUnits.get(u.id)
                return (
                  <li key={u.id}>
                    <button type="button" className={styles.unitRow} onClick={() => chooseUnit(u.id)}>
                      <span className={styles.unitName}>{unitName(u)}</span>
                      <span className={clsx(styles.unitStatus, rec && styles.unitStatusDone)}>
                        {rec
                          ? t('recommend.submittedBy', { name: rec.submitterName })
                          : t('recommend.notSubmitted')}
                      </span>
                      <ChevronRight size={18} aria-hidden className={styles.unitChevron} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </main>
      </div>
    )
  }

  const wardOptions = unit.wards.map((w) => ({ id: w.id, label: w[lang] }))
  const recencyOf = (wardId: string) => recencyText(data.wardStats?.[wardId])

  return (
    <div className={styles.page}>
      {header}
      <div className={styles.unitBar}>
        <div className={styles.unitBarInner}>
          <span className={styles.unitBarName}>{unitName(unit)}</span>
          <button type="button" className={styles.unitBarChange} onClick={leaveUnit}>
            {t('recommend.changeUnit')}
          </button>
        </div>
        <div className={styles.viewTabs} role="tablist" aria-label={t('recommend.calendarTitle')}>
          {(['list', 'calendar'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              className={clsx(styles.viewTab, view === v && styles.viewTabOn)}
              onClick={() => setView(v)}
            >
              {v === 'list' ? <List size={16} aria-hidden /> : <CalendarDays size={16} aria-hidden />}
              {t(v === 'list' ? 'recommend.viewList' : 'recommend.viewCalendar')}
            </button>
          ))}
        </div>
      </div>
      <main className={clsx(styles.content, styles.contentWide)}>
        {guidanceBox}
        {data.note && <p className={styles.note}>{data.note}</p>}
        {!isOpen && <div className={styles.closedBanner}>{t('recommend.closedBanner')}</div>}

        <div className={styles.layout} data-view={view}>
          <section className={styles.calendarCol} aria-labelledby="rec-calendar">
            <h2 id="rec-calendar" className={styles.stepTitle}>
              {t('recommend.calendarTitle')}
            </h2>
            <RecommendCalendar
              sundays={data.sundays}
              cells={cells}
              events={unitEvents}
              wards={wardOptions}
              recencyOf={recencyOf}
              picks={picks}
              onPick={(date, wardId) => setPicks((prev) => ({ ...prev, [date]: wardId }))}
              readOnly={!isOpen}
            />
          </section>

          <div className={styles.listCol}>
            {/* 와드 방문 기록 — 추천의 근거 */}
            <section className={styles.section} aria-labelledby="rec-stats">
              <h2 id="rec-stats" className={styles.stepTitle}>
                {t('recommend.statsTitle')}
              </h2>
              {/* 강조 사항이 있으면 위에서 이미 말했다 */}
              {!data.guidance && <p className={styles.stepHint}>{t('recommend.statsHint')}</p>}
              <WardStatsTable
                unit={unit}
                stats={data.wardStats ?? {}}
                today={today}
                lang={lang}
                recencyText={recencyText}
              />
            </section>

            {/* 1. 일요일별 추천 */}
            <section className={styles.section} aria-labelledby="rec-step2">
              <h2 id="rec-step2" className={styles.stepTitle}>
                <span className={styles.stepNo}>1</span>
                {t('recommend.step2')}
              </h2>
              <p className={styles.stepHint}>{t('recommend.step2Hint')}</p>
              <div className={styles.verified}>
                <ShieldCheck size={18} aria-hidden className={styles.verifiedIcon} />
                <div>
                  <div className={styles.verifiedTitle}>{t('recommend.verifiedTitle')}</div>
                  <p className={styles.verifiedBody}>{t('recommend.verifiedBody')}</p>
                </div>
              </div>
              <ol className={styles.sundayList}>
                {data.sundays.map((date, i) => {
                  const d = dayjs(date)
                  // 한 분기(석 달)를 받으니 달이 바뀌는 자리에 달 이름을 끼운다.
                  const monthHead =
                    i === 0 || data.sundays[i - 1].slice(0, 7) !== date.slice(0, 7)
                  const decision = data.decisions[date]
                  const others = data.recommendations.filter(
                    (r) => r.unitId !== unit.id && r.picks.some((p) => p.date === date),
                  )
                  const lockedByOther = !!decision && decision.unitId !== unit.id
                  const selectId = `rec-${date}`
                  const st = data.sundayStatus?.[date]
                  const busy = st?.busy ?? []
                  const kinds = new Set(busy.map((b) => b.kind))
                  const unitBlock = st && unit.id in st.unitBlocks ? st.unitBlocks[unit.id] : null
                  const blocked = !decision && (busy.length > 0 || unitBlock !== null)
                  const notes = (st?.notes ?? []).filter((n) => !n.unitIds || n.unitIds.includes(unit.id))
                  const busyLabels = busy.map((b) => b.label).filter(Boolean)
                  return (
                    <Fragment key={date}>
                    {monthHead && (
                      <li className={styles.monthHead} role="presentation">
                        {d.format(t('recommend.monthFormat'))}
                      </li>
                    )}
                    <li
                      className={clsx(
                        styles.sunday,
                        picks[date] && !lockedByOther && !blocked && styles.sundayPicked,
                        (decision || blocked) && styles.sundayDecided,
                      )}
                    >
                      <div className={styles.dateBlock}>
                        <span className={styles.dateMain}>{d.format(t('recommend.dateFormat'))}</span>
                        <span className={styles.dateSub}>
                          {kinds.has('generalConference')
                            ? t('recommend.generalConferenceSunday')
                            : kinds.has('fast')
                              ? t('recommend.fastSunday')
                              : t('recommend.dowSunday')}
                        </span>
                      </div>
                      <div className={styles.sundayBody}>
                        {decision ? (
                          <div className={styles.decision}>
                            {decision.unitId === unit.id
                              ? t('recommend.decidedOurs', { ward: wardLabel(unit, decision.wardId) || decision.wardName })
                              : t('recommend.decided', {
                                  unit: unitName(data.units.find((u) => u.id === decision.unitId)),
                                  ward: decision.wardName,
                                })}
                          </div>
                        ) : busy.length > 0 ? (
                          // 칠십인이 못 오는 날 — 무슨 일정인지는 공개하지 않는다(공개 행사 제목만).
                          <div className={styles.unavailable}>
                            {t('recommend.busy')}
                            {busyLabels.length > 0 && ` · ${busyLabels.join(', ')}`}
                          </div>
                        ) : unitBlock !== null ? (
                          <div className={styles.unavailable}>
                            {unitBlock
                              ? t('recommend.unitBlockedTitle', { title: unitBlock })
                              : t('recommend.unitBlocked')}
                          </div>
                        ) : (
                          <>
                            <button
                              id={selectId}
                              type="button"
                              className={clsx(styles.wardTrigger, picks[date] && styles.wardTriggerOn)}
                              aria-expanded={openDate === date}
                              disabled={!isOpen}
                              onClick={() => setOpenDate(openDate === date ? null : date)}
                            >
                              <span className={styles.visuallyHidden}>{d.format(t('recommend.dateFormat'))} </span>
                              <span className={styles.wardTriggerText}>
                                {picks[date] ? wardLabel(unit, picks[date]) : t('recommend.noPick')}
                              </span>
                              <ChevronDown size={16} aria-hidden className={styles.wardTriggerIcon} />
                            </button>
                            {openDate === date && (
                              <div className={styles.wardPicker}>
                                <WardPicker
                                  wards={wardOptions}
                                  recencyOf={recencyOf}
                                  value={picks[date] ?? ''}
                                  onChange={(wardId) => {
                                    setPicks((prev) => ({ ...prev, [date]: wardId }))
                                    setOpenDate(null)
                                  }}
                                />
                              </div>
                            )}
                          </>
                        )}
                        {!blocked &&
                          notes.map((n) => (
                            <p key={n.title} className={styles.eventNote}>
                              {t('recommend.noteEvent', { title: n.title })}
                            </p>
                          ))}
                        {!decision && !blocked && others.length > 0 && (
                          <div className={styles.others}>
                            <span className={styles.othersCount}>
                              {t('recommend.othersPicked', { count: others.length })}
                            </span>
                            <span className={styles.othersNames}>
                              {others
                                .map((r) => unitName(data.units.find((u) => u.id === r.unitId)))
                                .join(' · ')}
                            </span>
                          </div>
                        )}
                        {!blocked && !decision && picks[date] && others.length > 0 && (
                          <p className={styles.othersHint}>{t('recommend.othersPickedHint')}</p>
                        )}
                      </div>
                    </li>
                    </Fragment>
                  )
                })}
              </ol>
            </section>

            {isOpen && (
              <>
                {/* 3. 보내는 분 */}
                <section className={styles.section} aria-labelledby="rec-step3">
                  <h2 id="rec-step3" className={styles.stepTitle}>
                    <span className={styles.stepNo}>2</span>
                    {t('recommend.step3')}
                  </h2>
                  <label className={styles.fieldLabel} htmlFor="rec-name">
                    {t('recommend.nameLabel')}
                  </label>
                  <input
                    id="rec-name"
                    className={styles.input}
                    value={name}
                    maxLength={40}
                    autoComplete="name"
                    placeholder={t('recommend.namePlaceholder')}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <label className={styles.fieldLabel} htmlFor="rec-note">
                    {t('recommend.noteLabel')}
                  </label>
                  <textarea
                    id="rec-note"
                    className={styles.textarea}
                    value={note}
                    maxLength={500}
                    rows={3}
                    placeholder={t('recommend.notePlaceholder')}
                    onChange={(e) => {
                      setNote(e.target.value)
                      setNoteTouched(true)
                    }}
                  />
                  {myRec?.hasNote && !noteTouched && (
                    <p className={styles.fieldHint}>{t('recommend.noteKept')}</p>
                  )}
                </section>

                <div className={styles.submitBar}>
                  {submitError && (
                    <div className={styles.errorBanner} role="alert">
                      {submitError}
                    </div>
                  )}
                  <div className={styles.submitRow}>
                    <span className={styles.pickedCount}>
                      {pickedDates.length > 0
                        ? t('recommend.pickedCount', { count: pickedDates.length })
                        : t('recommend.pickedNone')}
                    </span>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      {submitting
                        ? t('recommend.submitting')
                        : myRec
                          ? t('recommend.resubmit')
                          : t('recommend.submit')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

/** 달력 칸 상태 — 목록과 같은 판정(확정 > 칠십인 불가 > 우리 단위 행사 > 추천 가능) */
function sundayCells(
  data: PublicVisitRequest,
  unit: VisitRequestUnit,
  picks: Record<string, string>,
  lang: 'ko' | 'en',
  t: TFunction,
): Record<string, SundayCellState> {
  const wardLabel = (wardId: string) => unit.wards.find((w) => w.id === wardId)?.[lang] ?? ''
  const out: Record<string, SundayCellState> = {}
  for (const date of data.sundays) {
    const decision = data.decisions[date]
    const st = data.sundayStatus?.[date]
    if (decision) {
      const ours = decision.unitId === unit.id
      const other = data.units.find((u) => u.id === decision.unitId)
      out[date] = {
        kind: 'decided',
        ours,
        label: ours
          ? wardLabel(decision.wardId) || decision.wardName
          : `${other ? other[lang] : ''} · ${decision.wardName}`,
      }
    } else if (st && st.busy.length > 0) {
      const labels = st.busy.map((b) => b.label).filter(Boolean)
      out[date] = { kind: 'busy', reason: [t('recommend.busy'), ...labels].join(' · ') }
    } else if (st && unit.id in st.unitBlocks) {
      const title = st.unitBlocks[unit.id]
      out[date] = {
        kind: 'unitBlocked',
        reason: title ? t('recommend.unitBlockedTitle', { title }) : t('recommend.unitBlocked'),
      }
    } else {
      out[date] = {
        kind: 'open',
        pickedWard: picks[date] ? wardLabel(picks[date]) || null : null,
        others: data.recommendations.filter(
          (r) => r.unitId !== unit.id && r.picks.some((p) => p.date === date),
        ).length,
      }
    }
  }
  return out
}

const TONE_CLASS: Record<RecencyTone, string> = {
  fresh: styles.toneFresh,
  aging: styles.toneAging,
  stale: styles.toneStale,
  never: styles.toneNever,
}

function WardStatsTable({
  unit,
  stats,
  today,
  lang,
  recencyText,
}: {
  unit: VisitRequestUnit
  stats: Record<string, WardVisitStat>
  today: string
  lang: 'ko' | 'en'
  recencyText: (s: WardVisitStat | undefined) => string
}) {
  const { t } = useTranslation()
  // 오래된 순(기록 없음이 맨 위) — 회장이 먼저 볼 것이 위에 온다.
  const rows = [...unit.wards].sort((a, b) => {
    const la = stats[a.id]?.lastVisit ?? ''
    const lb = stats[b.id]?.lastVisit ?? ''
    return la.localeCompare(lb)
  })
  return (
    <table className={styles.statsTable}>
      <thead>
        <tr>
          <th scope="col">{t('recommend.statsWard')}</th>
          <th scope="col">{t('recommend.statsLast')}</th>
          <th scope="col" className={styles.num}>
            {t('recommend.statsCount')}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((w) => {
          const stat = stats[w.id]
          const tone = wardRecency(stat, today).tone
          return (
            <tr key={w.id}>
              <th scope="row" className={styles.statsWard}>
                {w[lang]}
              </th>
              <td>
                <span className={clsx(styles.tone, TONE_CLASS[tone])}>{recencyText(stat)}</span>
                {stat?.lastVisit && (
                  <span className={styles.statsDate}>{dayjs(stat.lastVisit).format('YYYY.M.D')}</span>
                )}
                {stat?.nextVisit && (
                  <span className={styles.statsNext}>
                    {t('recommend.statsNext', { date: dayjs(stat.nextVisit).format('M.D') })}
                  </span>
                )}
              </td>
              <td className={styles.num}>{t('recommend.statsCountValue', { count: stat?.count12m ?? 0 })}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
