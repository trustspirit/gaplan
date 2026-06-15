import { Fragment, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { Video, CalendarDays, Building2, MoonStar, RefreshCw, CalendarPlus, FileText, ChevronUp, UserCheck } from 'lucide-react'
import { ALL_UNITS, WARDS } from '@/constants/regions'
import { fetchPublicSchedules, type PublicScheduleItem } from '@/services/scheduleService'
import { fetchPublicGeneralSchedules } from '@/services/generalScheduleService'
import type { GeneralSchedule } from '@/types'
import {
  loadScheduleCache,
  saveScheduleCache,
  clearScheduleCache,
} from '@/utils/scheduleCache'
import { getTodayMarkerPlacement } from './todayMarker'
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

function NotesText({ text, linkClass, textClass }: { text: string; linkClass: string; textClass: string }) {
  const urlRegex = /https?:\/\/[^\s)>\]"']+/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const url = match[0]
    parts.push(<a key={match.index} href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>{url}</a>)
    lastIndex = match.index + url.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <p className={textClass}>{parts}</p>
}

function buildSubscribeUrls(token: string) {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string
  const icsHttps = `https://asia-northeast3-${projectId}.cloudfunctions.net/publicScheduleIcs?token=${token}`
  const icsWebcal = icsHttps.replace('https://', 'webcal://')
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsWebcal)}`
  return { icsWebcal, googleUrl }
}

export default function PublicSchedulePage() {
  const { token } = useParams<{ token: string }>()
  const { t, i18n } = useTranslation()
  const [schedules, setSchedules] = useState<PublicScheduleItem[]>([])
  const [scopeDisplayName, setScopeDisplayName] = useState<string | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isPrivate, setIsPrivate] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [generalSchedules, setGeneralSchedules] = useState<GeneralSchedule[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [showSubscribeMenu, setShowSubscribeMenu] = useState(false)
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set())

  const toggleNotes = (id: string) => {
    setOpenNotes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
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

    // 동기 캐시 체크 — 캐시 히트 시 즉시 렌더 (스켈레톤 스킵)
    const cached = loadScheduleCache(token)
    if (cached) {
      setSchedules(cached.schedules)
      setGeneralSchedules(cached.generalSchedules)
      setScopeDisplayName(cached.scopeDisplayName)
      setIsInitialLoading(false)
    }

    // 항상 최신 데이터 백그라운드 fetch
    setRefreshing(true)
    Promise.all([
      fetchPublicSchedules(token),
      fetchPublicGeneralSchedules().catch(() => [] as GeneralSchedule[]),
    ])
      .then(([{ schedules: s, scopeDisplayName: name }, generals]) => {
        if (cancelled) return
        setSchedules(s)
        setScopeDisplayName(name)
        setGeneralSchedules(generals)
        setFetchError(false)
        saveScheduleCache(token, { schedules: s, generalSchedules: generals, scopeDisplayName: name })
      })
      .catch((e) => {
        if (cancelled) return
        const isPermission =
          e?.code === 'functions/permission-denied' ||
          e?.message?.includes('permission-denied')
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

    return () => { cancelled = true }
  }, [token, refreshKey])

  const toggleLang = () => {
    const next = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(next)
    localStorage.setItem('publicLang', next)
  }

  const handleRefresh = () => {
    if (token) clearScheduleCache(token)
    setRefreshKey(k => k + 1)
  }

  const lang = i18n.language

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
        <div className={styles.errorBox}>{t('public.fetchError')}</div>
      </div>
    )
  }

  const title = scopeDisplayName
    ? t('public.scopedTitle', { name: scopeDisplayName })
    : t('public.title')

  type ListEntry =
    | { kind: 'schedule'; data: PublicScheduleItem }
    | { kind: 'general'; data: GeneralSchedule }

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
    monthKeys.map(monthKey => ({
      groupKey: monthKey,
      dates: mergedMap.get(monthKey)!.map(entry => entry.data.date),
    })),
    today,
  )
  const { icsWebcal, googleUrl } = buildSubscribeUrls(token!)

  const typeLabel = (type: string) => {
    if (type === 'ward_visit') return t('public.typeVisit')
    if (type === 'interview') return t('public.typeInterview')
    if (type === 'meeting') return t('public.typeMeeting')
    return type
  }

  const dowLabels = lang === 'ko' ? DOW_KO : DOW_EN
  const renderTodayMarker = (monthKey: string, itemIndex: number) => {
    if (
      todayMarkerPlacement?.groupKey !== monthKey ||
      todayMarkerPlacement.itemIndex !== itemIndex
    ) return null

    return (
      <div className={styles.todayMarker}>
        <span className={styles.todayMarkerLine} />
        <span className={styles.todayMarkerLabel}>
          {t('public.todayMarker')}
        </span>
        <span className={styles.todayMarkerDate}>{dayjs(today).format('M.D')}</span>
        <span className={styles.todayMarkerLine} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>{title}</h1>
        <div className={styles.headerActions}>
          <button className={styles.langToggle} onClick={toggleLang}>
            {lang === 'ko' ? 'EN' : '한'}
          </button>
          <button
            className={styles.langToggle}
            onClick={handleRefresh}
            disabled={refreshing}
            title={t('common.refresh')}
            aria-label={t('common.refresh')}
          >
            <RefreshCw size={14} className={refreshing ? styles.spinning : undefined} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {isInitialLoading ? (
          <SkeletonCards />
        ) : monthKeys.length === 0 ? (
          <div className={styles.empty}>{t('public.empty')}</div>
        ) : (
          monthKeys.map((monthKey) => {
            const monthLabel = lang === 'ko'
              ? dayjs(monthKey).format('YYYY년 M월')
              : dayjs(monthKey).format('MMMM YYYY')
            return (
              <section key={monthKey} className={styles.monthGroup}>
                <h2 className={styles.monthLabel}>{monthLabel}</h2>
                <div className={styles.itemList}>
                  {mergedMap.get(monthKey)!.map((entry, entryIndex) => {
                    if (entry.kind === 'general') {
                      const gs = entry.data
                      const ICONS = { conference: Building2, fasting: MoonStar, other: CalendarDays } as const
                      const GIcon = ICONS[gs.category]
                      const gDate = dayjs(gs.date)
                      const catLabel = gs.category === 'conference'
                        ? (lang === 'ko' ? '대회/행사' : 'Conference')
                        : gs.category === 'fasting'
                          ? (lang === 'ko' ? '금식' : 'Fasting')
                          : (lang === 'ko' ? '기타' : 'Other')
                      return (
                        <Fragment key={`gs-${gs.id}`}>
                          {renderTodayMarker(monthKey, entryIndex)}
                          <div className={styles.scheduleRow}>
                          <div className={clsx(styles.colorBar, styles[`general_${gs.category}`])} />
                          <div className={clsx(styles.dateCol, styles[`general_${gs.category}`])}>
                            <span className={styles.date}>{gDate.format('M.D')}</span>
                            <span className={styles.dow}>{dowLabels[gDate.day()]}</span>
                          </div>
                          <div className={styles.itemBody}>
                            <span className={styles.typeBadge}>
                              <GIcon size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                              {catLabel}
                            </span>
                            <p className={styles.title}>{gs.title}</p>
                            {gs.startTime && gs.endTime && (
                              <p className={styles.time}>{gs.startTime} – {gs.endTime}</p>
                            )}
                          </div>
                          </div>
                        </Fragment>
                      )
                    }

                    const s = entry.data as PublicScheduleItem
                    const date = dayjs(s.date)
                    const dow = dowLabels[date.day()]
                    const isPast = date.isBefore(dayjs(), 'day')
                    const isVisit = s.type === 'ward_visit'
                    const isMeeting = s.type === 'meeting'
                    const unitName = getUnitName(s.unitId, lang)
                    const displayTitle = s.customTitle
                      ?? (unitName + (s.wardName ? ` · ${getWardName(s.wardName, lang)}` : ''))
                    const safeZoom = s.zoomLink && /^https?:\/\//i.test(s.zoomLink) ? s.zoomLink : null
                    const hasNotes = !!s.notes?.trim()
                    const notesOpen = openNotes.has(s.id)

                    return (
                      <Fragment key={s.id}>
                        {renderTodayMarker(monthKey, entryIndex)}
                        <div className={styles.scheduleRow} data-past={isPast}>
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
                                  <span>{t('schedule.presidentAccompanied')}</span>
                                </span>
                              )}
                            </div>
                            <p className={styles.title}>{displayTitle}</p>
                            <p className={styles.time}>{s.startTime} – {s.endTime}</p>
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
                          {isPast && <span className={styles.pastBadge}>{t('public.pastBadge')}</span>}
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
                            <NotesText
                              text={s.notes!}
                              linkClass={styles.notesLink}
                              textClass={styles.notesText}
                            />
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
      </main>

      {showSubscribeMenu && (
        <div className={styles.fabBackdrop} onClick={() => setShowSubscribeMenu(false)} />
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
          </div>
        )}
        <button
          className={styles.fab}
          onClick={() => setShowSubscribeMenu(v => !v)}
          aria-label={t('public.subscribeLabel')}
          aria-expanded={showSubscribeMenu}
        >
          <CalendarPlus size={22} />
        </button>
      </div>
    </div>
  )
}
