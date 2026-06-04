import { MapPin, Users, CalendarPlus } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { Schedule } from '@/types'
import styles from './ScheduleItem.module.scss'

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function buildGCalUrl(schedule: Schedule, unitName: string): string {
  const title = schedule.type === 'ward_visit'
    ? `와드 방문 - ${unitName}`
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
}

export function ScheduleItem({ schedule, unitName, past, showCalendarAdd = false }: ScheduleItemProps) {
  const { t } = useTranslation()
  const isVisit = schedule.type === 'ward_visit'
  const date = dayjs(schedule.date)
  const dow = DOW_LABELS[date.day()]
  const isPast = past ?? date.isBefore(dayjs(), 'day')

  return (
    <div
      className={clsx(
        styles.item,
        isVisit ? styles.visit : styles.interview,
        isPast && styles.past,
      )}
    >
      <div className={styles.dateBox}>
        <span className={styles.day}>{date.format('D')}</span>
        <span className={styles.month}>{date.format('M월')}</span>
        <span className={styles.dow}>{dow}</span>
      </div>
      <div className={styles.info}>
        <div className={styles.typeBadge}>
          {isVisit ? <MapPin size={11} /> : <Users size={11} />}
          <span>{isVisit ? t('schedule.type.ward_visit') : t('schedule.type.interview')}</span>
        </div>
        <p className={styles.unit}>{unitName}</p>
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
  )
}
