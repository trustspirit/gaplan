import { Fragment, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ALL_UNITS, WARDS } from '@/constants/regions'
import { fetchPublicWardVisits } from '@/services/publicScheduleService'
import type { PublicWardVisitItem } from '@/types/publicSchedule'
import {
  buildWardVisitYear,
  stakeShortName,
  type WardVisitEntry,
  type WardVisitMonth,
} from './wardVisitCalendar'
import styles from './WardVisitsView.module.scss'

const MIN_YEAR = 2000
const DOW_KO = ['일', '월', '화', '수', '목', '금', '토']
const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SLOT_KEYS = [
  'public.wardSlot1',
  'public.wardSlot2',
  'public.wardSlot3',
  'public.wardSlot4',
  'public.wardSlot5',
]
// _mixins.scss의 desktop 믹스인과 같은 폭 — 표와 카드가 바뀌는 곳(WardVisitsView.module.scss).
const DESKTOP_QUERY = '(min-width: 769px)'
// 고정 머리글 높이만큼 띄운다(todayMarker.ts의 topOffset과 같은 값).
const HEADER_OFFSET = 88

type Status = 'loading' | 'error' | 'ready'

function stakeFullName(unitId: string, lang: 'ko' | 'en'): string {
  const unit = ALL_UNITS.find((u) => u.id === unitId)
  return unit ? unit.name[lang] : unitId
}

function wardDisplayName(wardNameKo: string, lang: 'ko' | 'en'): string {
  if (lang !== 'en') return wardNameKo
  return WARDS.find((w) => w.name.ko === wardNameKo)?.name.en ?? wardNameKo
}

/**
 * 칠십인 개인 링크의 "방문 와드" 탭. 같은 한 해를 휴대폰에서는 달마다 일요일 줄로, 데스크톱에서는
 * 1년 표로 그린다(CSS가 폭에 따라 하나만 보인다).
 *
 * 색은 쓰지 않는다 — 스테이크 색과 방문 칸 색칠은 시선을 흩뜨린다고 사용자가 거절했다.
 * 방문은 진한 와드 이름 + 흐린 스테이크 이름, 예정은 흐린 글씨 + "예정"으로만 구분한다.
 */
export function WardVisitsView({ token }: { token: string }) {
  const { t, i18n } = useTranslation()
  const lang: 'ko' | 'en' = i18n.language === 'en' ? 'en' : 'ko'
  const dow = lang === 'ko' ? DOW_KO : DOW_EN
  const currentYear = dayjs().year()
  const today = dayjs().format('YYYY-MM-DD')

  const [year, setYear] = useState(currentYear)
  const [byYear, setByYear] = useState<Record<number, PublicWardVisitItem[]>>({})
  const [status, setStatus] = useState<Status>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const currentCardRef = useRef<HTMLElement | null>(null)
  const scrolledRef = useRef(false)

  const loaded = byYear[year]

  useEffect(() => {
    if (loaded) {
      setStatus('ready')
      return
    }
    let cancelled = false
    setStatus('loading')
    fetchPublicWardVisits(token, year)
      .then((visits) => {
        if (cancelled) return
        setByYear((prev) => ({ ...prev, [year]: visits }))
        setStatus('ready')
      })
      .catch((e) => {
        if (cancelled) return
        console.warn('[WardVisitsView] fetch failed:', e)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
    // loaded는 byYear[year]에서 나온다 — byYear가 바뀔 때마다 다시 부르지 않도록 year·token·재시도만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, year, retryKey])

  const months = loaded ? buildWardVisitYear(loaded, year, today) : null

  // 처음 이 탭을 열었을 때 한 번만, 휴대폰에서 이번 달 카드로 내린다(표는 한 화면에 다 보인다).
  useEffect(() => {
    if (scrolledRef.current || status !== 'ready' || year !== currentYear) return
    scrolledRef.current = true
    const card = currentCardRef.current
    if (!card) return
    if (typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP_QUERY).matches) return
    const top = card.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
    if (top > 0) window.scrollTo({ top, behavior: 'smooth' })
  }, [status, year, currentYear])

  const monthLabel = (m: WardVisitMonth, long: boolean) => {
    const d = dayjs(`${m.key}-01`)
    if (lang === 'ko') return long ? d.format('YYYY년 M월') : d.format('M월')
    return long ? d.format('MMMM YYYY') : d.format('MMM')
  }

  const renderVisit = (v: WardVisitEntry, withWeekday: boolean) => (
    <span
      key={v.id}
      className={styles.visit}
      data-visit
      data-planned={v.planned || undefined}
      title={stakeFullName(v.unitId, lang)}
    >
      <b className={styles.ward}>
        {wardDisplayName(v.wardName, lang)}
        {withWeekday && v.weekday !== 0 && ` (${dow[v.weekday]})`}
      </b>
      <em className={styles.stake}>{stakeShortName(v.unitId, lang)}</em>
      {v.planned && <span className={styles.planned}>{t('public.wardPlanned')}</span>}
    </span>
  )

  const renderCard = (m: WardVisitMonth) => {
    // 일요일 줄(방문이 없어도) + 평일 방문 줄을 날짜순으로 한 목록에.
    type Row = { date: string; visits: WardVisitEntry[] }
    const rows: Row[] = []
    for (const slot of m.slots) {
      if (slot.sundayDate) {
        rows.push({
          date: slot.sundayDate,
          visits: slot.visits.filter((v) => v.date === slot.sundayDate),
        })
      }
      for (const v of slot.visits)
        if (v.date !== slot.sundayDate) rows.push({ date: v.date, visits: [v] })
    }
    rows.sort((a, b) => a.date.localeCompare(b.date))
    const todayIndex = m.isCurrent ? rows.findIndex((r) => r.date > today) : -1

    return (
      <section
        key={m.key}
        className={styles.card}
        ref={
          m.isCurrent
            ? (el) => {
                currentCardRef.current = el
              }
            : undefined
        }
      >
        <h3 className={styles.cardHeader}>
          <span>{monthLabel(m, true)}</span>
          <span className={styles.cardSummary}>
            {t('public.wardMonthSummary', { visits: m.visitCount, sundays: m.sundayCount })}
          </span>
        </h3>
        <div className={styles.cardRows}>
          {rows.map((row, i) => (
            <Fragment key={row.date}>
              {i === todayIndex && (
                <div className={styles.todayMarker}>
                  <span className={styles.todayLine} />
                  <span className={styles.todayLabel}>{t('public.todayMarker')}</span>
                  <span className={styles.todayLine} />
                </div>
              )}
              <div className={styles.cardRow}>
                <span className={styles.day}>
                  {dayjs(row.date).date()}
                  <small>{dow[dayjs(row.date).day()]}</small>
                </span>
                <span className={styles.rowVisits}>
                  {row.visits.length === 0 ? (
                    <span className={styles.noVisit}>{t('public.wardNoVisit')}</span>
                  ) : (
                    row.visits.map((v) => renderVisit(v, false))
                  )}
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.yearNav}>
        <button
          type="button"
          className={styles.yearBtn}
          onClick={() => setYear((y) => y - 1)}
          disabled={year <= MIN_YEAR}
          aria-label={t('public.wardPrevYear')}
        >
          <ChevronLeft size={16} />
        </button>
        <span className={styles.yearLabel}>{lang === 'ko' ? `${year}년` : year}</span>
        <button
          type="button"
          className={styles.yearBtn}
          onClick={() => setYear((y) => y + 1)}
          disabled={year >= currentYear + 1}
          aria-label={t('public.wardNextYear')}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {status === 'error' && !months ? (
        <div className={styles.errorBox}>
          <span>{t('public.wardLoadError')}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => setRetryKey((k) => k + 1)}
          >
            {t('public.retry')}
          </button>
        </div>
      ) : !months ? (
        <div className={styles.loading} role="status">
          {t('public.loading')}
        </div>
      ) : (
        <>
          <div className={styles.cards}>{months.map(renderCard)}</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.monthCol}>{t('public.wardMonth')}</th>
                {SLOT_KEYS.map((key) => (
                  <th key={key}>{t(key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key} data-current={m.isCurrent || undefined}>
                  <td className={styles.monthCell}>{monthLabel(m, false)}</td>
                  {m.slots.map((slot) => (
                    <td key={slot.index} className={styles.slotCell}>
                      {slot.visits.map((v) => renderVisit(v, true))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
