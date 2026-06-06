import { useState } from 'react'
import { MapPin, Users, CalendarPlus, Coffee } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { Schedule } from '@/types'
import styles from './ScheduleItem.module.scss'

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function buildGCalUrl(schedule: Schedule, unitName: string): string {
  const locationLabel = schedule.wardName ? `${unitName} ${schedule.wardName}` : unitName
  const title = schedule.type === 'ward_visit'
    ? `와드 방문 - ${locationLabel}`
    : schedule.type === 'interview'
      ? `접견 - ${unitName}`
      : `모임 - ${unitName}`
  const start = `${schedule.date.replace(/-/g, '')}T${schedule.startTime.replace(':', '')}00`
  const end = `${schedule.date.replace(/-/g, '')}T${schedule.endTime.replace(':', '')}00`
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${start}/${end}` })
  return `https://calendar.google.com/calendar/render?${params}`
}

interface ScheduleItemProps {
  schedule: Schedule
  unitName: string
  past?: boolean
  showCalendarAdd?: boolean
  canEdit?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function ScheduleItem({
  schedule,
  unitName,
  past,
  showCalendarAdd = false,
  canEdit,
  onEdit,
  onDelete,
}: ScheduleItemProps) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const isVisit = schedule.type === 'ward_visit'
  const isMeeting = schedule.type === 'meeting'
  const date = dayjs(schedule.date)
  const dow = DOW_LABELS[date.day()]
  const isPast = past ?? date.isBefore(dayjs(), 'day')

  return (
    <div className={styles.wrapper}>
      {/* Left color bar */}
      <div className={clsx(styles.colorBar, isVisit ? styles.visitBar : isMeeting ? styles.meetingBar : styles.interviewBar)} />

      {/* Date column — wrapper level so bg/border span full height */}
      <div className={clsx(styles.dateCol, isPast && styles.past)}>
        <span className={styles.day}>{date.format('D')}</span>
        <div className={styles.dateMeta}>
          <span className={styles.month}>{date.format('M월')}</span>
          <span className={styles.dow}>{dow}</span>
        </div>
      </div>

      {/* Content */}
      <div
        className={clsx(
          styles.item,
          isVisit ? styles.visit : isMeeting ? styles.meeting : styles.interview,
          isPast && styles.past,
        )}
      >
        <div className={styles.info}>
          <div className={styles.typeBadge}>
            {isVisit ? <MapPin size={11} /> : isMeeting ? <Coffee size={11} /> : <Users size={11} />}
            <span>{t(`schedule.type.${schedule.type}`)}</span>
          </div>
          <p className={styles.unit}>
            {unitName}
            {schedule.wardName && <span className={styles.wardName}> · {schedule.wardName}</span>}
          </p>
          <p className={styles.time}>{schedule.startTime} – {schedule.endTime}</p>
        </div>
        {isPast && <span className={styles.pastBadge}>{t('common.complete')}</span>}
        {showCalendarAdd && !isPast && (
          <a
            href={buildGCalUrl(schedule, unitName)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.calendarAddBtn}
            title="내 캘린더에 추가"
          >
            <CalendarPlus size={15} />
          </a>
        )}
      </div>

      {/* Kebab menu — admin/seventy only */}
      {canEdit && (
        <div className={styles.kebabWrapper}>
          <button
            type="button"
            className={styles.kebabBtn}
            onClick={e => { e.stopPropagation(); setMenuOpen(prev => !prev) }}
            aria-label="더보기"
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
              <div className={styles.menu}>
                <button type="button" onClick={() => { setMenuOpen(false); onEdit?.() }}>편집</button>
                <button type="button" className={styles.deleteMenuItem} onClick={() => { setMenuOpen(false); onDelete?.() }}>삭제</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
