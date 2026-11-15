import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import type { HttpsCallable } from 'firebase/functions'
import { publicCallable } from '@/services/publicFunctions'
import { isFastSunday } from '@/utils/fastSunday'
import { wardRecency, type RecencyTone } from '@/utils/visitRequest'
import type { PublicVisitRequest, VisitRequestUnit, WardVisitStat } from '@/types'
import styles from './RecommendPage.module.scss'

interface SubmitRequest {
  token: string
  unitId: string
  submitterName: string
  note: string
  picks: { date: string; wardId: string }[]
}

let getFn: HttpsCallable<{ token: string }, PublicVisitRequest> | null = null
let submitFn: HttpsCallable<SubmitRequest, { success: boolean }> | null = null
const getRequest = () =>
  (getFn ??= publicCallable<{ token: string }, PublicVisitRequest>('getVisitRequestPublic'))
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

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; invalid: boolean }
  | { kind: 'ready'; data: PublicVisitRequest }

export default function RecommendPage({ token }: { token: string | undefined }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'en' ? 'en' : 'ko'
  const today = dayjs().format('YYYY-MM-DD')

  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [unitId, setUnitId] = useState(() => (token ? readStored(`recommendUnit:${token}`) : ''))
  const [picks, setPicks] = useState<Record<string, string>>({}) // date -> wardId
  const [name, setName] = useState(() => readStored('recommendName'))
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [sent, setSent] = useState<{ date: string; wardId: string }[]>([])

  useEffect(() => {
    const saved = readStored('publicLang')
    if (saved && saved !== i18n.language) i18n.changeLanguage(saved)
  }, [i18n])

  useEffect(() => {
    if (!token) {
      setState({ kind: 'error', invalid: true })
      return
    }
    let cancelled = false
    // 다시 받을 때(제출 뒤 새로고침)는 화면을 비우지 않는다.
    setState((prev) => (prev.kind === 'ready' ? prev : { kind: 'loading' }))
    getRequest()({ token })
      .then((res) => !cancelled && setState({ kind: 'ready', data: res.data }))
      .catch((err: { code?: string }) => {
        if (cancelled) return
        setState({ kind: 'error', invalid: err?.code === 'functions/permission-denied' })
      })
    return () => {
      cancelled = true
    }
  }, [token, reloadKey])

  const data = state.kind === 'ready' ? state.data : null
  const unit = data?.units.find((u) => u.id === unitId) ?? null
  const myRec = data?.recommendations.find((r) => r.unitId === unitId) ?? null

  // 단위를 고르면 그 단위가 이미 낸 추천으로 채운다 — 다시 연 회장은 고칠 것만 고치면 된다.
  const loadUnit = useCallback(
    (id: string, source: PublicVisitRequest) => {
      const rec = source.recommendations.find((r) => r.unitId === id)
      setPicks(Object.fromEntries((rec?.picks ?? []).map((p) => [p.date, p.wardId])))
      setNote(rec?.note ?? '')
      if (rec?.submitterName) setName(rec.submitterName)
    },
    [],
  )

  useEffect(() => {
    if (data && unitId && data.units.some((u) => u.id === unitId)) loadUnit(unitId, data)
    // data가 새로 올 때만 — 입력 중에 덮어쓰지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const chooseUnit = (id: string) => {
    if (!data || id === unitId) return
    setUnitId(id)
    if (token) writeStored(`recommendUnit:${token}`, id)
    loadUnit(id, data)
    setSubmitError(null)
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

  const pickedDates = useMemo(
    () => Object.entries(picks).filter(([, w]) => w).map(([d]) => d),
    [picks],
  )

  const handleSubmit = async () => {
    if (!token || !unit || !data) return
    if (!name.trim()) {
      setSubmitError(t('recommend.nameRequired'))
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = pickedDates
        .filter((d) => !data.decisions[d] || data.decisions[d].unitId === unit.id)
        .sort()
        .map((date) => ({ date, wardId: picks[date] }))
      await submitRecommendation()({
        token,
        unitId: unit.id,
        submitterName: name.trim(),
        note: note.trim(),
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

  const header = (
    <header className={styles.header}>
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
          </section>
        </main>
      </div>
    )
  }

  const submittedUnits = new Map(data.recommendations.map((r) => [r.unitId, r]))

  return (
    <div className={styles.page}>
      {header}
      <main className={styles.content}>
        {data.note && <p className={styles.note}>{data.note}</p>}
        {!isOpen && <div className={styles.closedBanner}>{t('recommend.closedBanner')}</div>}

        {/* 1. 단위 고르기 */}
        <section className={styles.section} aria-labelledby="rec-step1">
          <h2 id="rec-step1" className={styles.stepTitle}>
            <span className={styles.stepNo}>1</span>
            {t('recommend.step1')}
          </h2>
          <p className={styles.stepHint}>{t('recommend.step1Hint')}</p>
          <div className={styles.unitGrid} role="radiogroup" aria-labelledby="rec-step1">
            {data.units.map((u) => {
              const rec = submittedUnits.get(u.id)
              return (
                <button
                  key={u.id}
                  type="button"
                  role="radio"
                  aria-checked={u.id === unitId}
                  className={clsx(styles.unitBtn, u.id === unitId && styles.unitBtnActive)}
                  onClick={() => chooseUnit(u.id)}
                >
                  <span className={styles.unitName}>{unitName(u)}</span>
                  <span className={clsx(styles.unitStatus, rec && styles.unitStatusDone)}>
                    {rec ? t('recommend.submittedBy', { name: rec.submitterName }) : t('recommend.notSubmitted')}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {unit && (
          <>
            {/* 와드 방문 기록 — 추천의 근거 */}
            <section className={styles.section} aria-labelledby="rec-stats">
              <h2 id="rec-stats" className={styles.stepTitle}>
                {t('recommend.statsTitle')}
              </h2>
              <p className={styles.stepHint}>{t('recommend.statsHint')}</p>
              <WardStatsTable
                unit={unit}
                stats={data.wardStats ?? {}}
                today={today}
                lang={lang}
                recencyText={recencyText}
              />
            </section>

            {/* 2. 일요일별 추천 */}
            <section className={styles.section} aria-labelledby="rec-step2">
              <h2 id="rec-step2" className={styles.stepTitle}>
                <span className={styles.stepNo}>2</span>
                {t('recommend.step2')}
              </h2>
              <p className={styles.stepHint}>{t('recommend.step2Hint')}</p>
              <ol className={styles.sundayList}>
                {data.sundays.map((date) => {
                  const d = dayjs(date)
                  const decision = data.decisions[date]
                  const others = data.recommendations.filter(
                    (r) => r.unitId !== unit.id && r.picks.some((p) => p.date === date),
                  )
                  const lockedByOther = !!decision && decision.unitId !== unit.id
                  const selectId = `rec-${date}`
                  return (
                    <li
                      key={date}
                      className={clsx(
                        styles.sunday,
                        picks[date] && !lockedByOther && styles.sundayPicked,
                        decision && styles.sundayDecided,
                      )}
                    >
                      <div className={styles.dateBlock}>
                        <span className={styles.dateMain}>{d.format(t('recommend.dateFormat'))}</span>
                        <span className={styles.dateSub}>
                          {isFastSunday(d) ? t('recommend.fastSunday') : t('recommend.dowSunday')}
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
                        ) : (
                          <>
                            <label className={styles.visuallyHidden} htmlFor={selectId}>
                              {d.format(t('recommend.dateFormat'))}
                            </label>
                            <select
                              id={selectId}
                              className={styles.wardSelect}
                              value={picks[date] ?? ''}
                              disabled={!isOpen}
                              onChange={(e) => setPicks((prev) => ({ ...prev, [date]: e.target.value }))}
                            >
                              <option value="">{t('recommend.noPick')}</option>
                              {unit.wards.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {t('recommend.wardOptionStat', {
                                    ward: w[lang],
                                    recency: recencyText(data.wardStats?.[w.id]),
                                  })}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                        {!decision && others.length > 0 && (
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
                        {!lockedByOther && !decision && picks[date] && others.length > 0 && (
                          <p className={styles.othersHint}>{t('recommend.othersPickedHint')}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>

            {isOpen && (
              <>
                {/* 3. 보내는 분 */}
                <section className={styles.section} aria-labelledby="rec-step3">
                  <h2 id="rec-step3" className={styles.stepTitle}>
                    <span className={styles.stepNo}>3</span>
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
                    onChange={(e) => setNote(e.target.value)}
                  />
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
          </>
        )}
      </main>
    </div>
  )
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
