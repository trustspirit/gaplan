import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import {
  Video,
  CalendarDays,
  Building2,
  MoonStar,
  RefreshCw,
  CalendarPlus,
  FileText,
  ChevronUp,
  ChevronDown,
  UserCheck,
  User,
  Lock,
  MapPin,
} from 'lucide-react'
import { ALL_UNITS, WARDS } from '@/constants/regions'
import { isMultiDayEvent } from '@/types'
import { isMultiDaySchedule, scheduleLastDate } from '@/utils/scheduleDates'
import {
  fetchPublicScheduleHistory,
  fetchPublicSchedulePageData,
  type PublicGeneralScheduleItem,
  type PublicScheduleItem,
} from '@/services/publicScheduleService'
import { loadScheduleCache, saveScheduleCache, clearScheduleCache } from '@/utils/scheduleCache'
import { readInlinePublicData } from '@/utils/inlinePublicData'
import { getTodayMarkerPlacement, getTodayMarkerScrollTop } from './todayMarker'
import { WardVisitsView } from './WardVisitsView'
import styles from './PublicSchedulePage.module.scss'

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토']
const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getUnitName(unitId: string, lang: string) {
  const unit = ALL_UNITS.find((u) => u.id === unitId)
  if (!unit) return unitId
  return lang === 'en' ? unit.name.en : unit.name.ko
}

function getWardName(wardNameKo: string, lang: string) {
  if (lang !== 'en') return wardNameKo
  return WARDS.find((w) => w.name.ko === wardNameKo)?.name.en ?? wardNameKo
}

// 위로 스크롤해 화면 맨 위에서 이만큼 안쪽으로 들어오면 이전 일정을 이어 받는다.
const HISTORY_TRIGGER_PX = 400

/**
 * 이전 일정 불러오기 상태.
 * unavailable: 서버가 historyBefore를 주지 않았다(배포 전 함수) — 줄 자체를 감춘다.
 * end: 끝까지 받았다 — "더 없음"을 보여준다.
 */
type HistoryStatus = 'unavailable' | 'idle' | 'loading' | 'error' | 'end'

/** 이미 있는 항목을 앞세워(더 최신 응답이다) 이전 일정을 앞에 붙인다. */
function prependById<T extends { id: string }>(current: T[], older: T[]): T[] {
  const seen = new Set(current.map((item) => item.id))
  return [...older.filter((item) => !seen.has(item.id)), ...current]
}

function SkeletonCards() {
  return (
    <>
      <div className={clsx(styles.skeleton, styles.skeletonMonthLabel)} />
      <div className={styles.itemList}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.scheduleRow}>
            <div className={styles.scheduleRowMain}>
              <div className={clsx(styles.colorBar, styles.skeletonBar)} />
              <div className={clsx(styles.dateCol, styles.skeletonDateCol)}>
                <div className={clsx(styles.skeleton, styles.skeletonDate)} />
                <div className={clsx(styles.skeleton, styles.skeletonDow)} />
              </div>
              <div className={styles.itemBody}>
                <div className={clsx(styles.skeleton, styles.skeletonBadge)} />
                <div className={clsx(styles.skeleton, styles.skeletonTitle)} />
                <div className={clsx(styles.skeleton, styles.skeletonTime)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function NotesText({
  text,
  linkClass,
  textClass,
}: {
  text: string
  linkClass: string
  textClass: string
}) {
  const urlRegex = /https?:\/\/[^\s)>\]"']+/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const url = match[0]
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {url}
      </a>,
    )
    lastIndex = match.index + url.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <p className={textClass}>{parts}</p>
}

// Outlook's "add calendar from web" endpoint expects a plain https ICS URL
// (not the webcal:// scheme). The host differs by account type:
// personal accounts (Hotmail/Live/Outlook.com) → outlook.live.com,
// work/school Microsoft 365 accounts → outlook.office.com. The user picks which
// via the subscribe menu, so this just assembles the deep link for a given host.
function buildOutlookUrl(host: string, icsHttps: string, name: string): string {
  const url = encodeURIComponent(icsHttps)
  const label = encodeURIComponent(name)
  return `https://${host}/calendar/0/addfromweb?url=${url}&name=${label}`
}

function buildSubscribeUrls(token: string, outlookName: string) {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string
  const icsHttps = `https://asia-northeast3-${projectId}.cloudfunctions.net/publicScheduleIcs?token=${token}`
  const icsWebcal = icsHttps.replace('https://', 'webcal://')
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsWebcal)}`
  const outlookPersonalUrl = buildOutlookUrl('outlook.live.com', icsHttps, outlookName)
  const outlookWorkUrl = buildOutlookUrl('outlook.office.com', icsHttps, outlookName)
  return { icsWebcal, googleUrl, outlookPersonalUrl, outlookWorkUrl }
}

export interface PublicSchedulePageProps {
  /** URL의 공개 토큰. 라우터가 있는 본 앱은 라우트가, 공개 전용 엔트리는
   *  pathname 파싱이 넘긴다 — 한 컴포넌트가 두 방식을 알지 않게 한다. */
  token?: string
}

export default function PublicSchedulePage({ token }: PublicSchedulePageProps) {
  const { t, i18n } = useTranslation()
  const [schedules, setSchedules] = useState<PublicScheduleItem[]>([])
  const [scopeDisplayName, setScopeDisplayName] = useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isPrivate, setIsPrivate] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [generalSchedules, setGeneralSchedules] = useState<PublicGeneralScheduleItem[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [showSubscribeMenu, setShowSubscribeMenu] = useState(false)
  const [showOutlookChoice, setShowOutlookChoice] = useState(false)
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set())
  const todayMarkerRef = useRef<HTMLDivElement | null>(null)
  const autoScrolledToTodayRef = useRef(false)
  const mainRef = useRef<HTMLElement | null>(null)
  const historyBarRef = useRef<HTMLDivElement | null>(null)
  const [historyCursor, setHistoryCursor] = useState<string | null>(null)
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>('unavailable')
  // 새로고침·토큰 변경 뒤에 도착한 이전 일정 응답은 버린다 — 새 목록에 옛 쪽이 섞인다.
  const historyGenRef = useRef(0)
  // 이전 일정을 위에 붙이기 직전, 맨 위 항목의 화면 위치. 붙인 뒤 그만큼 스크롤을 되돌려
  // 보던 자리가 아래로 밀리지 않게 한다.
  const historyAnchorRef = useRef<{ el: HTMLElement; top: number } | null>(null)
  // 칠십인 개인 링크에서만 "방문 와드" 탭이 생긴다. 최신 응답에서만 켠다(historyBefore와 같은 이유).
  const [wardVisitsAvailable, setWardVisitsAvailable] = useState(false)
  const [view, setView] = useState<'schedule' | 'wards'>('schedule')
  // 한 번 연 방문 와드 탭은 숨겨 두기만 한다 — 탭을 오갈 때마다 다시 받고 다시 스크롤하지 않게.
  // 새로고침은 refreshKey로 다시 띄워 받은 기록을 버린다.
  const [wardsOpened, setWardsOpened] = useState(false)
  // 이번 달로 내리기는 이 페이지에서 처음 탭을 열 때 한 번뿐이다(새로고침해도 다시 하지 않는다).
  const [wardsAutoScrolled, setWardsAutoScrolled] = useState(false)
  const markWardsAutoScrolled = useCallback(() => setWardsAutoScrolled(true), [])

  const toggleNotes = (id: string) => {
    setOpenNotes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Initialize language from localStorage — run once on mount only
  useEffect(() => {
    const saved = localStorage.getItem('publicLang')
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved)
    }
  }, [i18n])

  useEffect(() => {
    if (!token) {
      setIsInitialLoading(false)
      return
    }

    let cancelled = false
    historyGenRef.current += 1
    setHistoryCursor(null)
    setHistoryStatus('unavailable')

    // 동기 씨앗 — 있으면 즉시 렌더(스켈레톤 스킵). 서버가 문서에 심어 준 데이터를
    // 먼저 본다: 이 문서와 함께 도착한 것이라 왕복이 없다. 없으면 지난 방문의
    // sessionStorage 캐시. 어느 쪽이든 아래 백그라운드 fetch가 곧 덮으므로
    // 둘 중 어느 게 더 최신인지는 따지지 않는다.
    const cached = readInlinePublicData(token) ?? loadScheduleCache(token)
    if (cached) {
      setSchedules(cached.schedules)
      setGeneralSchedules(cached.generalSchedules)
      setScopeDisplayName(cached.scopeDisplayName)
      setIsInitialLoading(false)
    }

    // 항상 최신 데이터 백그라운드 fetch
    setRefreshing(true)
    fetchPublicSchedulePageData(token)
      .then(({ schedules: s, generalSchedules: generals, scopeDisplayName: name, historyBefore, wardVisitsAvailable: wards }) => {
        if (cancelled) return
        setWardVisitsAvailable(wards === true)
        if (wards !== true) setView('schedule')
        setSchedules(s)
        setScopeDisplayName(name)
        setGeneralSchedules(generals)
        setFetchError(false)
        // 이전 일정의 경계는 방금 받은 최신 응답에서만 잡는다 — 문서에 심긴 데이터나 캐시는
        // 경계가 다를 수 있어(배포 전 데이터) 그 사이 일정이 빠질 수 있다.
        setHistoryCursor(historyBefore ?? null)
        setHistoryStatus(historyBefore ? 'idle' : 'unavailable')
        saveScheduleCache(token, {
          schedules: s,
          generalSchedules: generals,
          scopeDisplayName: name,
        })
      })
      .catch((e) => {
        if (cancelled) return
        const isPermission =
          e?.code === 'functions/permission-denied' || e?.message?.includes('permission-denied')
        if (isPermission) {
          setIsPrivate(true)
        } else if (!cached) {
          // 캐시 없을 때만 에러 표시 — 캐시 있으면 stale 데이터 유지
          setFetchError(true)
        } else {
          console.warn('[PublicSchedulePage] background refresh failed:', e)
        }
      })
      .finally(() => {
        if (cancelled) return
        setIsInitialLoading(false)
        setRefreshing(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, refreshKey])

  useEffect(() => {
    autoScrolledToTodayRef.current = false
  }, [token])

  const toggleLang = () => {
    const next = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(next)
    localStorage.setItem('publicLang', next)
  }

  // keepPosition: 스크롤로 불렀으면 보던 항목을 제자리에 둔다. 버튼으로 불렀으면 버튼 줄을
  // 제자리에 둬 그 바로 아래로 이전 일정이 펼쳐지게 한다 — 보던 항목을 지키면 새 일정이 화면
  // 위로 밀려나 아무 일도 없는 것처럼 보인다.
  const loadOlder = useCallback((keepPosition: boolean) => {
    if (!token || !historyCursor) return
    if (historyStatus !== 'idle' && historyStatus !== 'error') return

    const gen = historyGenRef.current
    // 이전 일정을 보기 시작했으면 "오늘"로 자동 스크롤할 일은 더 없다.
    autoScrolledToTodayRef.current = true
    setHistoryStatus('loading')
    fetchPublicScheduleHistory(token, historyCursor)
      .then((page) => {
        if (gen !== historyGenRef.current) return
        const anchor = keepPosition
          ? mainRef.current?.querySelector<HTMLElement>('[data-entry-id]')
          : historyBarRef.current
        historyAnchorRef.current = anchor ? { el: anchor, top: anchor.getBoundingClientRect().top } : null
        setSchedules((prev) => prependById(prev, page.schedules))
        setGeneralSchedules((prev) => prependById(prev, page.generalSchedules))
        setHistoryCursor(page.nextBefore)
        setHistoryStatus(page.nextBefore ? 'idle' : 'end')
      })
      .catch((e) => {
        if (gen !== historyGenRef.current) return
        console.warn('[PublicSchedulePage] history fetch failed:', e)
        setHistoryStatus('error')
      })
  }, [token, historyCursor, historyStatus])

  // 위에 붙인 만큼 스크롤을 내려 보던 항목을 제자리에 둔다. 브라우저의 스크롤 고정
  // (overflow-anchor)이 이미 맞춰 줬다면 차이가 0이라 아무것도 하지 않는다 — iOS Safari처럼
  // 그게 없는 곳에서만 실제로 움직인다.
  useLayoutEffect(() => {
    const anchor = historyAnchorRef.current
    if (!anchor) return
    historyAnchorRef.current = null
    if (!anchor.el.isConnected) return
    const delta = anchor.el.getBoundingClientRect().top - anchor.top
    if (delta !== 0) window.scrollBy(0, delta)
  })

  // 사용자가 위로 스크롤해 맨 위 근처에 오면 이어 받는다. 아래로 움직이는 스크롤(처음
  // "오늘"로 내려가는 자동 스크롤, 붙인 뒤의 위치 보정)은 무시한다. 실패하면 자동으로 다시
  // 부르지 않고 버튼으로 재시도하게 둔다.
  useEffect(() => {
    if (historyStatus !== 'idle' || view !== 'schedule') return
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const movingUp = y < lastY
      lastY = y
      if (movingUp && y < HISTORY_TRIGGER_PX) loadOlder(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [historyStatus, loadOlder, view])

  const handleRefresh = () => {
    if (token) clearScheduleCache(token)
    setRefreshKey((k) => k + 1)
  }

  const lang = i18n.language

  const title = scopeDisplayName
    ? t('public.scopedTitle', { name: scopeDisplayName })
    : t('public.title')

  type ListEntry =
    | { kind: 'schedule'; data: PublicScheduleItem }
    | { kind: 'general'; data: PublicGeneralScheduleItem }

  const mergedMap = new Map<string, ListEntry[]>()
  for (const s of schedules) {
    const key = dayjs(s.date).format('YYYY-MM')
    if (!mergedMap.has(key)) mergedMap.set(key, [])
    mergedMap.get(key)!.push({ kind: 'schedule', data: s })
  }
  for (const gs of generalSchedules) {
    const key = dayjs(gs.date).format('YYYY-MM')
    if (!mergedMap.has(key)) mergedMap.set(key, [])
    mergedMap.get(key)!.push({ kind: 'general', data: gs })
  }
  for (const [, items] of mergedMap) {
    items.sort((a, b) => {
      const aDate = a.data.date
      const bDate = b.data.date
      const aTime = a.kind === 'schedule' ? a.data.startTime : (a.data.startTime ?? '00:00')
      const bTime = b.kind === 'schedule' ? b.data.startTime : (b.data.startTime ?? '00:00')
      return aDate.localeCompare(bDate) || aTime.localeCompare(bTime)
    })
  }
  const monthKeys = [...mergedMap.keys()].sort()
  const today = dayjs().format('YYYY-MM-DD')
  const todayMarkerPlacement = getTodayMarkerPlacement(
    monthKeys.map((monthKey) => ({
      groupKey: monthKey,
      dates: mergedMap.get(monthKey)!.map((entry) => entry.data.date),
    })),
    today,
  )
  const { icsWebcal, googleUrl, outlookPersonalUrl, outlookWorkUrl } = buildSubscribeUrls(token ?? '', title)

  const typeLabel = (type: string) => {
    if (type === 'ward_visit') return t('public.typeVisit')
    if (type === 'interview') return t('public.typeInterview')
    if (type === 'meeting') return t('public.typeMeeting')
    return type
  }

  const dowLabels = lang === 'ko' ? DOW_KO : DOW_EN

  useEffect(() => {
    if (isInitialLoading || !todayMarkerPlacement || autoScrolledToTodayRef.current) return

    const marker = todayMarkerRef.current
    if (!marker) return

    const targetTop = getTodayMarkerScrollTop({
      markerTop: marker.getBoundingClientRect().top,
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
    })
    if (targetTop === null) {
      // "오늘"이 이미 화면 위쪽에 보여 내릴 필요가 없다 — 그 판정도 한 번으로 끝낸다. 열어 두면
      // 이전 일정을 위에 붙여 "오늘"이 밀려난 순간 다시 판정해 오늘로 끌어내린다. 캐시로 먼저
      // 그린 화면은 최신 데이터가 오면 달라질 수 있어, 그때까지는 판정을 미룬다.
      if (!refreshing) autoScrolledToTodayRef.current = true
      return
    }

    autoScrolledToTodayRef.current = true
    window.scrollTo({ top: targetTop, behavior: 'smooth' })
  }, [isInitialLoading, refreshing, todayMarkerPlacement])

  const renderTodayMarker = (monthKey: string, itemIndex: number) => {
    if (todayMarkerPlacement?.groupKey !== monthKey || todayMarkerPlacement.itemIndex !== itemIndex)
      return null

    return (
      <div ref={todayMarkerRef} className={styles.todayMarker}>
        <span className={styles.todayMarkerLine} />
        <span className={styles.todayMarkerLabel}>{t('public.todayMarker')}</span>
        <span className={styles.todayMarkerDate}>{dayjs(today).format('M.D')}</span>
        <span className={styles.todayMarkerLine} />
      </div>
    )
  }

  if (isPrivate) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>{t('public.privateError')}</div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <span>{t('public.fetchError')}</span>
          <button
            type="button"
            className={styles.errorRetryBtn}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? t('public.loading') : t('public.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>{title}</h1>
        {/* 칠십인 개인 링크의 보기 전환. 본문 맨 위에 두면 스크롤할 때 함께 올라가 사라져
            고정 머리글에 둔다 — 데스크톱은 가운데, 휴대폰은 오른쪽 버튼들 앞. */}
        {wardVisitsAvailable && (
          <div className={styles.viewTabs} role="tablist">
            {(['schedule', 'wards'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className={clsx(styles.viewTab, view === v && styles.viewTabActive)}
                onClick={() => {
                  setView(v)
                  if (v === 'wards') setWardsOpened(true)
                }}
              >
                {v === 'schedule' ? <CalendarDays size={15} /> : <MapPin size={15} />}
                <span>{v === 'schedule' ? t('public.tabSchedule') : t('public.tabWardVisits')}</span>
              </button>
            ))}
          </div>
        )}
        <div className={styles.headerActions}>
          <button className={styles.langToggle} onClick={toggleLang}>
            {lang === 'ko' ? 'EN' : '한'}
          </button>
          <button
            className={styles.langToggle}
            onClick={handleRefresh}
            disabled={refreshing}
            title={t('public.refresh')}
            aria-label={t('public.refresh')}
          >
            <RefreshCw size={14} className={refreshing ? styles.spinning : undefined} />
          </button>
        </div>
      </header>

      <main className={styles.main} ref={mainRef}>
        {wardsOpened && token && (
          <div hidden={view !== 'wards'}>
            <WardVisitsView
              key={refreshKey}
              token={token}
              scrollToCurrentMonth={!wardsAutoScrolled}
              onAutoScrolled={markWardsAutoScrolled}
            />
          </div>
        )}
        {view === 'wards' ? null : (
        <>
        {!isInitialLoading && historyStatus !== 'unavailable' && (
          <div className={styles.historyBar} ref={historyBarRef}>
            {historyStatus === 'idle' && (
              <button type="button" className={styles.historyBtn} onClick={() => loadOlder(false)}>
                <ChevronUp size={14} />
                {t('public.historyLoad')}
              </button>
            )}
            {historyStatus === 'loading' && (
              <span className={styles.historyStatus} role="status">
                <RefreshCw size={13} className={styles.spinning} />
                {t('public.historyLoading')}
              </span>
            )}
            {historyStatus === 'error' && (
              <>
                <span className={styles.historyStatus}>{t('public.historyError')}</span>
                <button type="button" className={styles.historyBtn} onClick={() => loadOlder(false)}>
                  {t('public.retry')}
                </button>
              </>
            )}
            {historyStatus === 'end' && (
              <span className={styles.historyStatus}>{t('public.historyEnd')}</span>
            )}
          </div>
        )}
        {isInitialLoading ? (
          <SkeletonCards />
        ) : monthKeys.length === 0 ? (
          <div className={styles.empty}>{t('public.empty')}</div>
        ) : (
          monthKeys.map((monthKey) => {
            const monthLabel =
              lang === 'ko'
                ? dayjs(monthKey).format('YYYY년 M월')
                : dayjs(monthKey).format('MMMM YYYY')
            return (
              <section key={monthKey} className={styles.monthGroup}>
                <h2 className={styles.monthLabel}>{monthLabel}</h2>
                <div className={styles.itemList}>
                  {mergedMap.get(monthKey)!.map((entry, entryIndex) => {
                    if (entry.kind === 'general') {
                      const gs = entry.data
                      const ICONS = {
                        conference: Building2,
                        fasting: MoonStar,
                        other: CalendarDays,
                      } as const
                      const GIcon = ICONS[gs.category]
                      const gDate = dayjs(gs.date)
                      const gIsPast = gDate.isBefore(dayjs(), 'day')
                      const catLabel =
                        gs.category === 'conference'
                          ? lang === 'ko'
                            ? '대회/행사'
                            : 'Conference'
                          : gs.category === 'fasting'
                            ? lang === 'ko'
                              ? '금식'
                              : 'Fasting'
                            : lang === 'ko'
                              ? '기타'
                              : 'Other'
                      return (
                        <Fragment key={`gs-${gs.id}`}>
                          {renderTodayMarker(monthKey, entryIndex)}
                          <div
                            className={styles.scheduleRow}
                            data-past={gIsPast}
                            data-kind="general"
                            data-entry-id={`gs-${gs.id}`}
                          >
                            <div className={styles.scheduleRowMain}>
                              <div className={styles.colorBar} data-type={gs.category} />
                              <div className={styles.dateCol} data-type={gs.category}>
                                <span className={styles.date}>{gDate.format('M.D')}</span>
                                {/* 여러 날 행사는 좁은 날짜 칸에 요일 대신 종료일을 이어 붙인다 —
                                    ICS·구글 캘린더에서 이틀로 보이는 행사가 여기서만
                                    하루로 보이지 않도록. */}
                                {isMultiDayEvent(gs) ? (
                                  <span className={styles.dateEnd}>
                                    –{dayjs(gs.endDate).format('M.D')}
                                  </span>
                                ) : (
                                  <span className={styles.dow}>{dowLabels[gDate.day()]}</span>
                                )}
                              </div>
                              <div className={styles.itemBody}>
                                <span className={styles.typeBadge}>
                                  <GIcon
                                    size={11}
                                    style={{
                                      display: 'inline',
                                      marginRight: 3,
                                      verticalAlign: 'middle',
                                    }}
                                  />
                                  {catLabel}
                                </span>
                                {gs.seventyAttends && (
                                  <span className={styles.presidentBadge}>
                                    <UserCheck size={10} />
                                    <span>{t('public.seventyAttends')}</span>
                                  </span>
                                )}
                                <p className={styles.title}>{gs.title}</p>
                                {gs.startTime && gs.endTime && (
                                  <p className={styles.time}>
                                    {gs.startTime} – {gs.endTime}
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* 칠십인 전용 메모는 칠십인 전용 페이지에서만 온다. 행사에는 펼침 버튼이
                                없으므로 줄 아래에 바로 보여준다. */}
                            {gs.seventyNotes?.trim() && (
                              <div className={styles.notesPanel}>
                                <div className={styles.seventyNotes}>
                                  <p className={styles.seventyNotesTitle}>
                                    <Lock size={11} /> {t('public.seventyNotesTitle')}
                                  </p>
                                  <NotesText
                                    text={gs.seventyNotes.trim()}
                                    linkClass={styles.notesLink}
                                    textClass={styles.notesText}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </Fragment>
                      )
                    }

                    const s = entry.data as PublicScheduleItem
                    const date = dayjs(s.date)
                    const dow = dowLabels[date.day()]
                    // 여러 날 모임은 마지막 날이 지나야 지난 일정이고, 종료 시각 앞에 마지막 날을 붙인다.
                    const lastDate = dayjs(scheduleLastDate(s))
                    const isPast = lastDate.isBefore(dayjs(), 'day')
                    const lastDayLabel = isMultiDaySchedule(s)
                      ? `${lastDate.format('M.D')}(${dowLabels[lastDate.day()]})`
                      : null
                    // 종일 일정은 시각 대신 "종일"로 보여준다(여러 날이면 마지막 날을 붙인다).
                    const timeLabel = s.allDay
                      ? lastDayLabel ? `${t('public.allDay')} – ${lastDayLabel}` : t('public.allDay')
                      : `${s.startTime} – ${lastDayLabel ? `${lastDayLabel} ` : ''}${s.endTime}`
                    const isVisit = s.type === 'ward_visit'
                    const isMeeting = s.type === 'meeting'
                    const unitName = getUnitName(s.unitId, lang)
                    const displayTitle =
                      s.customTitle ??
                      unitName + (s.wardName ? ` · ${getWardName(s.wardName, lang)}` : '')
                    const safeZoom =
                      s.zoomLink && /^https?:\/\//i.test(s.zoomLink) ? s.zoomLink : null
                    const seventyNotes = s.seventyNotes?.trim()
                    const hasNotes = !!s.notes?.trim() || !!seventyNotes
                    const notesOpen = openNotes.has(s.id)

                    return (
                      <Fragment key={s.id}>
                        {renderTodayMarker(monthKey, entryIndex)}
                        <div className={styles.scheduleRow} data-past={isPast} data-entry-id={s.id}>
                          <div className={styles.scheduleRowMain}>
                            <div
                              className={styles.colorBar}
                              data-type={isVisit ? 'visit' : isMeeting ? 'meeting' : 'interview'}
                            />
                            <div
                              className={styles.dateCol}
                              data-type={isVisit ? 'visit' : isMeeting ? 'meeting' : 'interview'}
                            >
                              <span className={styles.date}>{date.format('M.D')}</span>
                              <span className={styles.dow}>{dow}</span>
                            </div>
                            <div className={styles.itemBody}>
                              <div className={styles.topRow}>
                                <span className={styles.typeBadge}>{typeLabel(s.type)}</span>
                                {s.presidentAccompanied && (
                                  <span className={styles.presidentBadge}>
                                    <UserCheck size={10} />
                                    <span>{t('public.presidentAccompanied')}</span>
                                  </span>
                                )}
                              </div>
                              <p className={styles.title}>{displayTitle}</p>
                              <p className={styles.time}>
                                {timeLabel}
                              </p>
                              {safeZoom && (
                                <a
                                  href={safeZoom}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.zoomLink}
                                >
                                  <Video size={11} />
                                  <span>Zoom</span>
                                </a>
                              )}
                            </div>
                            {isPast && (
                              <span className={styles.pastBadge}>{t('public.pastBadge')}</span>
                            )}
                            {hasNotes && (
                              <button
                                type="button"
                                className={clsx(styles.notesBtn, notesOpen && styles.notesBtnOpen)}
                                onClick={() => toggleNotes(s.id)}
                                title="메모 보기"
                                aria-expanded={notesOpen}
                              >
                                {notesOpen ? <ChevronUp size={14} /> : <FileText size={14} />}
                              </button>
                            )}
                          </div>
                          {notesOpen && hasNotes && (
                            <div className={styles.notesPanel}>
                              {s.notes?.trim() && (
                                <NotesText
                                  text={s.notes}
                                  linkClass={styles.notesLink}
                                  textClass={styles.notesText}
                                />
                              )}
                              {seventyNotes && (
                                <div className={styles.seventyNotes}>
                                  <p className={styles.seventyNotesTitle}>
                                    <Lock size={11} /> {t('public.seventyNotesTitle')}
                                  </p>
                                  <NotesText
                                    text={seventyNotes}
                                    linkClass={styles.notesLink}
                                    textClass={styles.notesText}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Fragment>
                    )
                  })}
                  {renderTodayMarker(monthKey, mergedMap.get(monthKey)!.length)}
                </div>
              </section>
            )
          })
        )}
        </>
        )}
      </main>

      {showSubscribeMenu && (
        <div className={styles.fabBackdrop} onClick={() => { setShowSubscribeMenu(false); setShowOutlookChoice(false) }} />
      )}
      <div className={styles.fabArea}>
        {showSubscribeMenu && (
          <div className={styles.subscribeMenu}>
            <a
              href={icsWebcal}
              className={styles.subscribeOption}
              onClick={() => setShowSubscribeMenu(false)}
            >
              <CalendarDays size={15} />
              {t('public.appleCalendar')}
            </a>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.subscribeOption}
              onClick={() => setShowSubscribeMenu(false)}
            >
              <CalendarDays size={15} />
              {t('public.googleCalendar')}
            </a>
            <button
              type="button"
              className={styles.subscribeOption}
              onClick={() => setShowOutlookChoice(v => !v)}
              aria-expanded={showOutlookChoice}
            >
              <CalendarDays size={15} />
              {t('public.outlookCalendar')}
              {showOutlookChoice
                ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} />
                : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
            </button>
            {showOutlookChoice && (
              <>
                <a
                  href={outlookPersonalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.subscribeSubOption}
                  onClick={() => setShowSubscribeMenu(false)}
                >
                  <User size={14} />
                  {t('public.outlookPersonal')}
                </a>
                <a
                  href={outlookWorkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.subscribeSubOption}
                  onClick={() => setShowSubscribeMenu(false)}
                >
                  <Building2 size={14} />
                  {t('public.outlookWork')}
                </a>
              </>
            )}
          </div>
        )}
        <button
          className={styles.fab}
          onClick={() => {
            setShowSubscribeMenu((v) => !v)
            setShowOutlookChoice(false)
          }}
          aria-label={t('public.subscribeLabel')}
          aria-expanded={showSubscribeMenu}
        >
          <CalendarPlus size={22} />
        </button>
      </div>
    </div>
  )
}
