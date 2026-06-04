import { MapPin, Users } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import type { Schedule } from '@/types'
import styles from './ScheduleItem.module.scss'

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface ScheduleItemProps {
  schedule: Schedule
  unitName: string
  past?: boolean
}

export function ScheduleItem({ schedule, unitName, past }: ScheduleItemProps) {
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
          <span>{isVisit ? '와드 방문' : '접견'}</span>
        </div>
        <p className={styles.unit}>{unitName}</p>
        <p className={styles.time}>{schedule.startTime} – {schedule.endTime}</p>
      </div>
      {isPast && <span className={styles.pastBadge}>완료</span>}
    </div>
  )
}
