import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { CalendarDays, ChevronDown, Info, List } from 'lucide-react'
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
  note?: string   // 안 보내면 서버가 예전 메모를 그대로 둔다
  picks: { date: string; wardId: string }[]
}

/** lang=en이면 서버가 행사·일정·CC 이름도 영어로 보낸다 */
type GetRequest = { requestId: string; token: string; lang?: 'en' }
let getFn: HttpsCallable<GetRequest, PublicVisitRequest> | null = null
let submitFn: HttpsCallable<SubmitRequest, { success: boolean }> | null = null
const getRequest = () =>
  (getFn ??= publicCallable<GetRequest, PublicVisitRequest>('getVisitRequestPublic'))
const submitRecommendation = () =>
  (submitFn ??= publicCallable<SubmitRequest, { success: boolean }>('submitVisitRecommendation'))

// 저장소가 막혀 있어도(사생활 보호 모드 등) 페이지는 돌아야 한다.
function readStored(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}
/** 본 앱이 언어를 저장하는 키(src/i18n) */
const APP_LANG_KEY = 'gaplan-lang'

/** 이 일요일이 다른 CC 차례인가 — 그러면 그 CC 이름, 아니면 null */
function otherRegionTurn(data: PublicVisitRequest, unit: VisitRequestUnit, date: string): string | null {
  const turn = data.sundayRegions?.[date]
  if (!turn || unit.regionId === turn) return null
  return data.regions?.find((r) => r.id === turn)?.name ?? turn
}

const WIDE_QUERY = '(min-width: 960px)'

/** 두 단으로 펼치는 넓은 화면인가 — 그때는 달력에서 고른 일요일을 목록에서 연다 */
function useWide(): boolean {
  const query = () => (typeof window.matchMedia === 'function' ? window.matchMedia(WIDE_QUERY) : null)
  const [wide, setWide] = useState(() => query()?.matches ?? false)
  useEffect(() => {
    const mq = query()
    if (!mq) return
    const onChange = () => setWide(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return wide
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
  const [picks, setPicks] = useState<Record<string, string>>({}) // date -> wardId
  const [note, setNote] = useState('')
  // 메모는 공개 응답에 오지 않는다. 손대지 않았으면 보내지 않아 예전 메모를 지키고, 적었으면 바꾼다.
  const [noteTouched, setNoteTouched] = useState(false)
  // 저장된 추천으로 칸을 채웠는가. 다시 받아 올 때마다 채우면 고치던 선택이 날아간다.
  const prefilledFor = useRef<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [sent, setSent] = useState<{ date: string; wardId: string }[]>([])
  // 좁은 화면에서만 쓰는 보기 전환. 넓은 화면은 달력과 목록을 나란히 둔다(CSS).
  const [view, setView] = useState<'list' | 'calendar'>('list')
  // 목록에서 와드 고르는 칸은 한 번에 하나만 펼친다.
  const [openDate, setOpenDate] = useState<string | null>(null)
  const isWide = useWide()

  // 언어는 링크가 정한다 — 영어로 보내는 스테이크의 링크만 ?lang=en, 나머지는 한국어.
  // 브라우저에 남기지 않는다: 남기면 같은 브라우저로 연 한국어 링크까지 영어로 열린다.
  // 나갈 때 앱 언어로 되돌린다(이 페이지는 본 앱 안에서 돈다).
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'ko'
    if (want !== i18n.language) i18n.changeLanguage(want)
    return () => {
      const app = readStored(APP_LANG_KEY) || 'ko'
      if (app !== i18n.language) i18n.changeLanguage(app)
    }
  }, [i18n])

  useEffect(() => {
    if (!token || !requestId) {
      setState({ kind: 'error', invalid: true })
      return
    }
    let cancelled = false
    // 다시 받을 때(제출 뒤 새로고침)는 화면을 비우지 않는다.
    setState((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }))
    getRequest()({ requestId, token, ...(lang === 'en' && { lang: 'en' as const }) })
      .then((res) => !cancelled && setState({ kind: 'ready', data: res.data }))
      .catch((err: { code?: string }) => {
        if (cancelled) return
        const invalid = err?.code === 'functions/permission-denied'
        // 이미 화면이 떠 있으면(제출 뒤·언어 전환 뒤 다시 받기) 실패해도 그대로 둔다 — 보낸 직후
        // "불러오지 못했습니다"가 뜨면 회장은 추천이 안 갔다고 읽는다. 링크가 막힌 경우만 알린다.
        setState((prev) => (prev.kind === 'ready' && !invalid ? prev : { kind: 'error', invalid }))
      })
    return () => {
      cancelled = true
    }
  }, [requestId, token, reloadKey, lang])

  const data = state.kind === 'ready' ? state.data : null
  // 링크는 스테이크마다 따로다 — 서버는 링크가 연 스테이크 하나만 보낸다.
  const unit = data?.units[0] ?? null
  const unitId = unit?.id ?? ''
  const myRec = data?.recommendations.find((r) => r.unitId === unitId) ?? null

  // 이미 낸 추천으로 채운다 — 다시 연 회장은 고칠 것만 고치면 된다. 처음 받은 데이터로 한 번만.
  useEffect(() => {
    if (!data || !unitId || prefilledFor.current === unitId) return
    const rec = data.recommendations.find((r) => r.unitId === unitId)
    setPicks(Object.fromEntries((rec?.picks ?? []).map((p) => [p.date, p.wardId])))
    prefilledFor.current = unitId
  }, [data, unitId])

  // 화면에서 바꾸면 주소에만 적는다 — 새로 고쳐도 그 언어로
  const toggleLang = () => {
    const next = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(next)
    try {
      const url = new URL(window.location.href)
      if (next === 'en') url.searchParams.set('lang', 'en')
      else url.searchParams.delete('lang')
      window.history.replaceState(window.history.state, '', url)
    } catch {
      /* 주소를 못 바꿔도 화면 언어는 바뀌었다 */
    }
  }

  const unitName = (u: Pick<VisitRequestUnit, 'ko' | 'en'> | undefined) => (u ? u[lang] : '')
  // 영어로 열었고 옮겨 둔 값이 있으면 그것으로 — 없으면 입력한 그대로
  const texts = data
    ? lang === 'en' && data.english
      ? data.english
      : { title: data.title, guidance: data.guidance, note: data.note, seventy: data.seventyName }
    : null
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
          // 칠십인이 이 스테이크에서 뺀 일요일은 목록에 없어 고칠 수도 없다 — 예전 추천이 남아 있어도 보내지 않는다.
          if (data && !data.sundays.includes(d)) return false
          const decision = data?.decisions[d]
          if (decision) return decision.unitId === unitId
          if (data && unit && otherRegionTurn(data, unit, d) !== null) return false
          // 칠십인이 못 오는 날·우리 단위 행사가 있는 날은 보내지 않는다(서버도 거절한다).
          const st = data?.sundayStatus?.[d]
          return !st || (st.busy.length === 0 && !(unitId in st.unitBlocks))
        })
        .map(([d]) => d)
        .sort(),
    [picks, data, unit, unitId],
  )

  const cells = data && unit ? sundayCells(data, unit, picks, lang, t) : {}
  // 이 단위와 관련 있는 공개 행사만 — 다른 스테이크 대회는 이 회장에게 소음이다.
  const unitEvents = (data?.calendarEvents ?? []).filter(
    (e) => !e.unitIds || (!!unit && e.unitIds.includes(unit.id)),
  )

  const handleSubmit = async () => {
    if (!token || !requestId || !unit || !data) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = pickedDates.map((date) => ({ date, wardId: picks[date] }))
      await submitRecommendation()({
        requestId,
        token,
        unitId: unit.id,
        ...(noteTouched ? { note: note.trim() } : {}),
        picks: payload,
      })
      setSent(payload)
      setDone(true)
      setReloadKey((k) => k + 1) // 그사이 바뀐 확정을 새로 받아 둔다
    } catch {
      // 서버 메시지는 영어 진단용이다. 그사이 마감·확정됐을 수 있으니 최신 상태를 다시 받는다.
      setSubmitError(t('recommend.submitFailed'))
      setReloadKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  // 추천 화면은 넓은 화면에서 두 단으로 펼친다 — 머리글도 같은 폭에 맞춘다.
  const wide = state.kind === 'ready' && !done && !!unit
  const header = (
    <header className={clsx(styles.header, wide && styles.headerWide)}>
      <button type="button" className={styles.langToggle} onClick={toggleLang}>
        {i18n.language === 'ko' ? 'EN' : '한'}
      </button>
      <div className={styles.kicker}>{t('recommend.kicker')}</div>
      {data && <h1 className={styles.title}>{texts?.title}</h1>}
      {data && (
        <div className={styles.meta}>
          {texts?.seventy && <span>{t('recommend.seventyBy', { name: texts.seventy })}</span>}
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

  if (state.kind === 'error' || !data || !unit) {
    // 스테이크가 없으면(링크의 스테이크가 요청에서 빠졌으면) 잘못된 링크와 같다
    const invalid = state.kind !== 'error' || state.invalid
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

  if (done) {
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
          </section>
        </main>
      </div>
    )
  }

  const guidanceBox = texts?.guidance ? (
    <aside className={styles.guidance} aria-label={t('recommend.guidanceTitle')}>
      <Info size={18} aria-hidden className={styles.guidanceIcon} />
      <p className={styles.guidanceText}>{texts.guidance}</p>
    </aside>
  ) : null

  const wardOptions = unit.wards.map((w) => ({ id: w.id, label: w[lang] }))
  // 넓은 화면: 달력에서 누른 일요일을 목록에서 펼친다 — 고르는 곳은 목록 하나
  const openFromCalendar = (date: string) => {
    if (!isWide) return
    setOpenDate(date)
    document.getElementById(`rec-row-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const recencyOf = (wardId: string) => recencyText(data.wardStats?.[wardId])

  return (
    <div className={styles.page}>
      {header}
      <div className={styles.unitBar}>
        <div className={styles.unitBarInner}>
          <span className={styles.unitBarName}>{unitName(unit)}</span>
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
        {texts?.note && <p className={styles.note}>{texts.note}</p>}
        {!isOpen && <div className={styles.closedBanner}>{t('recommend.closedBanner')}</div>}

        {/* 넓은 화면: 왼쪽은 할 일(일요일별 추천·보내기), 오른쪽은 참고(방문 기록·달력).
            좁은 화면은 목록/달력 탭으로 나눠 보인다. */}
        <div className={styles.layout} data-view={view}>
          <aside className={styles.refCol}>
            {/* 와드 방문 기록 — 추천의 근거 */}
            <section className={clsx(styles.section, styles.statsSection)} aria-labelledby="rec-stats">
              <h2 id="rec-stats" className={styles.stepTitle}>
                {t('recommend.statsTitle')}
              </h2>
              {/* 강조 사항이 있으면 위에서 이미 말했다 */}
              {!texts?.guidance && <p className={styles.stepHint}>{t('recommend.statsHint')}</p>}
              <WardStatsTable
                unit={unit}
                stats={data.wardStats ?? {}}
                today={today}
                lang={lang}
                recencyText={recencyText}
              />
            </section>

            <section className={styles.calendarCol} aria-labelledby="rec-calendar">
              <h2 id="rec-calendar" className={styles.stepTitle}>
                {t('recommend.calendarTitle')}
              </h2>
              <p className={styles.stepHint}>{t(isWide ? 'recommend.calendarHintWide' : 'recommend.calendarHint')}</p>
              <RecommendCalendar
                sundays={data.sundays}
                cells={cells}
                events={unitEvents}
                wards={wardOptions}
                recencyOf={recencyOf}
                picks={picks}
                onPick={(date, wardId) => setPicks((prev) => ({ ...prev, [date]: wardId }))}
                readOnly={!isOpen}
                onSelect={openFromCalendar}
                inlinePicker={!isWide}
              />
            </section>
          </aside>

          <div className={styles.listCol}>

            {/* 1. 일요일별 추천 */}
            <section className={clsx(styles.section, styles.listSection)} aria-labelledby="rec-step2">
              <h2 id="rec-step2" className={styles.stepTitle}>
                <span className={styles.stepNo}>1</span>
                {t('recommend.step2')}
              </h2>
              <p className={styles.stepHint}>{t('recommend.step2Hint')}</p>
              <ol className={styles.sundayList}>
                {data.sundays.map((date, i) => {
                  const d = dayjs(date)
                  // 한 분기(석 달)를 받으니 달이 바뀌는 자리에 달 이름을 끼운다.
                  const monthHead =
                    i === 0 || data.sundays[i - 1].slice(0, 7) !== date.slice(0, 7)
                  const decision = data.decisions[date]
                  const lockedByOther = !!decision && decision.unitId !== unit.id
                  const selectId = `rec-${date}`
                  const st = data.sundayStatus?.[date]
                  const busy = st?.busy ?? []
                  const kinds = new Set(busy.map((b) => b.kind))
                  const unitBlock = st && unit.id in st.unitBlocks ? st.unitBlocks[unit.id] : null
                  const otherTurn = decision ? null : otherRegionTurn(data, unit, date)
                  const blocked = !decision && (otherTurn !== null || busy.length > 0 || unitBlock !== null)
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
                      id={`rec-row-${date}`}
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
                              : t('recommend.decidedOther')}
                          </div>
                        ) : otherTurn !== null ? (
                          <div className={styles.unavailable}>{t('recommend.otherRegion', { region: otherTurn })}</div>
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
                      </div>
                    </li>
                    </Fragment>
                  )
                })}
              </ol>
            </section>

            {isOpen && (
              <>
                {/* 2. 남길 말 */}
                <section className={styles.section} aria-labelledby="rec-step3">
                  <h2 id="rec-step3" className={styles.stepTitle}>
                    <span className={styles.stepNo}>2</span>
                    {t('recommend.step3')}
                  </h2>
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
      // 다른 스테이크로 확정된 날은 어디인지 알려 주지 않는다(서버도 보내지 않는다)
      const ours = decision.unitId === unit.id
      out[date] = {
        kind: 'decided',
        ours,
        label: ours ? wardLabel(decision.wardId) || decision.wardName : t('recommend.decidedOther'),
      }
    } else if (otherRegionTurn(data, unit, date) !== null) {
      out[date] = {
        kind: 'otherRegion',
        reason: t('recommend.otherRegion', { region: otherRegionTurn(data, unit, date) }),
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
