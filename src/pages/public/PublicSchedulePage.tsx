import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Video, CalendarDays } from 'lucide-react'
import { ALL_UNITS } from '@/constants/regions'
import { fetchPublicSchedules, type PublicScheduleItem } from '@/services/scheduleService'
import styles from './PublicSchedulePage.module.scss'

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const TYPE_LABELS: Record<string, string> = {
  ward_visit: '와드 방문',
  interview: '접견',
  meeting: '모임',
}

function getUnitName(unitId: string) {
  return ALL_UNITS.find((u) => u.id === unitId)?.name ?? unitId
}

function groupByMonth(schedules: PublicScheduleItem[]): Map<string, PublicScheduleItem[]> {
  const map = new Map<string, PublicScheduleItem[]>()
  for (const s of schedules) {
    const key = dayjs(s.date).format('YYYY년 M월')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return map
}

function buildSubscribeUrls() {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string
  const icsHttps = `https://asia-northeast3-${projectId}.cloudfunctions.net/publicScheduleIcs`
  const icsWebcal = icsHttps.replace('https://', 'webcal://')
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsWebcal)}`
  return { icsWebcal, googleUrl }
}

export default function PublicSchedulePage() {
  const [schedules, setSchedules] = useState<PublicScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPublicSchedules()
      .then(setSchedules)
      .catch((e) => setError(e?.message ?? '일정을 불러올 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>{error}</div>
      </div>
    )
  }

  const grouped = groupByMonth(schedules)
  const monthKeys = [...grouped.keys()]
  const { icsWebcal, googleUrl } = buildSubscribeUrls()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>일정표</h1>
        <div className={styles.subscribeRow}>
          <CalendarDays size={14} className={styles.subscribeIcon} />
          <span className={styles.subscribeLabel}>캘린더 구독</span>
          <a href={icsWebcal} className={styles.subscribeBtn}>
            Apple 캘린더
          </a>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={styles.subscribeBtn}>
            Google 캘린더
          </a>
        </div>
      </header>

      <main className={styles.main}>
        {monthKeys.length === 0 ? (
          <div className={styles.empty}>확정된 일정이 없습니다.</div>
        ) : (
          monthKeys.map((monthKey) => {
            const items = grouped.get(monthKey)!
            return (
              <section key={monthKey} className={styles.monthGroup}>
                <h2 className={styles.monthLabel}>{monthKey}</h2>
                <div className={styles.itemList}>
                  {items.map((s) => {
                    const date = dayjs(s.date)
                    const dow = DOW_LABELS[date.day()]
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
                          <span className={styles.typeBadge}>{TYPE_LABELS[s.type] ?? s.type}</span>
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
                        {isPast && <span className={styles.pastBadge}>완료</span>}
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
