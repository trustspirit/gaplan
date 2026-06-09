import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { Video, CalendarDays } from 'lucide-react'
import { ALL_UNITS } from '@/constants/regions'
import { fetchPublicSchedules, type PublicScheduleItem } from '@/services/scheduleService'
import styles from './PublicSchedulePage.module.scss'

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토']
const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getUnitName(unitId: string) {
  return ALL_UNITS.find((u) => u.id === unitId)?.name ?? unitId
}

function groupByMonth(schedules: PublicScheduleItem[], lang: string): Map<string, PublicScheduleItem[]> {
  const map = new Map<string, PublicScheduleItem[]>()
  for (const s of schedules) {
    const date = dayjs(s.date)
    const key = lang === 'ko'
      ? date.format('YYYY년 M월')
      : date.format('MMMM YYYY')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return map
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
    fetchPublicSchedules(token)
      .then(({ schedules: s, scopeDisplayName: name }) => {
        setSchedules(s)
        setScopeDisplayName(name)
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

  const grouped = groupByMonth(schedules, lang)
  const monthKeys = [...grouped.keys()]
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
            const items = grouped.get(monthKey)!
            return (
              <section key={monthKey} className={styles.monthGroup}>
                <h2 className={styles.monthLabel}>{monthKey}</h2>
                <div className={styles.itemList}>
                  {items.map((s) => {
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
