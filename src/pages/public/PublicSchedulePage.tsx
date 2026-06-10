import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { Video, CalendarDays, Building2, MoonStar } from 'lucide-react'
import { ALL_UNITS } from '@/constants/regions'
import { fetchPublicSchedules, type PublicScheduleItem } from '@/services/scheduleService'
import { fetchPublicGeneralSchedules } from '@/services/generalScheduleService'
import type { GeneralSchedule } from '@/types'
import styles from './PublicSchedulePage.module.scss'

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토']
const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getUnitName(unitId: string) {
  return ALL_UNITS.find((u) => u.id === unitId)?.name ?? unitId
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
  const [loading, setLoading] = useState(true)
  const [isPrivate, setIsPrivate] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [generalSchedules, setGeneralSchedules] = useState<GeneralSchedule[]>([])

  // Initialize language from localStorage — run once on mount only
  useEffect(() => {
    const saved = localStorage.getItem('publicLang')
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved)
    }
  }, [i18n])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    Promise.all([fetchPublicSchedules(token), fetchPublicGeneralSchedules()])
      .then(([{ schedules: s, scopeDisplayName: name }, generals]) => {
        setSchedules(s)
        setScopeDisplayName(name)
        setGeneralSchedules(generals)
      })
      .catch((e) => {
        if (e?.code === 'functions/permission-denied' || e?.message?.includes('permission-denied')) {
          setIsPrivate(true)
        } else {
          setFetchError(true)
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  const toggleLang = () => {
    const next = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(next)
    localStorage.setItem('publicLang', next)
  }

  const lang = i18n.language

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>{t('public.loading')}</div>
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
    const key = lang === 'ko' ? dayjs(s.date).format('YYYY년 M월') : dayjs(s.date).format('MMMM YYYY')
    if (!mergedMap.has(key)) mergedMap.set(key, [])
    mergedMap.get(key)!.push({ kind: 'schedule', data: s })
  }
  for (const gs of generalSchedules) {
    const key = lang === 'ko' ? dayjs(gs.date).format('YYYY년 M월') : dayjs(gs.date).format('MMMM YYYY')
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
  const { icsWebcal, googleUrl } = buildSubscribeUrls(token!)

  const typeLabel = (type: string) => {
    if (type === 'ward_visit') return t('public.typeVisit')
    if (type === 'interview') return t('public.typeInterview')
    if (type === 'meeting') return t('public.typeMeeting')
    return type
  }

  const dowLabels = lang === 'ko' ? DOW_KO : DOW_EN

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>{title}</h1>
        <div className={styles.subscribeRow}>
          <CalendarDays size={14} className={styles.subscribeIcon} />
          <span className={styles.subscribeLabel}>{t('public.subscribeLabel')}</span>
          <a href={icsWebcal} className={styles.subscribeBtn}>
            {t('public.appleCalendar')}
          </a>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={styles.subscribeBtn}>
            {t('public.googleCalendar')}
          </a>
          <button className={styles.langToggle} onClick={toggleLang}>
            {lang === 'ko' ? 'EN' : '한'}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {monthKeys.length === 0 ? (
          <div className={styles.empty}>{t('public.empty')}</div>
        ) : (
          monthKeys.map((monthKey) => {
            return (
              <section key={monthKey} className={styles.monthGroup}>
                <h2 className={styles.monthLabel}>{monthKey}</h2>
                <div className={styles.itemList}>
                  {mergedMap.get(monthKey)!.map(entry => {
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
                        <div key={`gs-${gs.id}`} className={styles.scheduleRow}>
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
                      )
                    }

                    const s = entry.data as PublicScheduleItem
                    const date = dayjs(s.date)
                    const dow = dowLabels[date.day()]
                    const isPast = date.isBefore(dayjs(), 'day')
                    const isVisit = s.type === 'ward_visit'
                    const isMeeting = s.type === 'meeting'
                    const unitName = getUnitName(s.unitId)
                    const displayTitle = s.customTitle
                      ?? (unitName + (s.wardName ? ` · ${s.wardName}` : ''))
                    const safeZoom = s.zoomLink && /^https?:\/\//i.test(s.zoomLink) ? s.zoomLink : null

                    return (
                      <div key={s.id} className={styles.scheduleRow} data-past={isPast}>
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
                          <span className={styles.typeBadge}>{typeLabel(s.type)}</span>
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
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })
        )}
      </main>
    </div>
  )
}
