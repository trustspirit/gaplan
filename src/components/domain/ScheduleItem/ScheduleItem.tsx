import { MapPin, Users } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import type { Schedule } from '@/types'
import styles from './ScheduleItem.module.scss'

interface ScheduleItemProps { schedule: Schedule; unitName: string }
export function ScheduleItem({ schedule, unitName }: ScheduleItemProps) {
  const isVisit = schedule.type === 'ward_visit'
  return (
    <div className={clsx(styles.item, isVisit ? styles.visit : styles.interview)}>
      <div className={styles.dateBox}>
        <span className={styles.day}>{dayjs(schedule.date).format('D')}</span>
        <span className={styles.month}>{dayjs(schedule.date).format('M월')}</span>
      </div>
      <div className={styles.info}>
        <div className={styles.type}>
          {isVisit ? <MapPin size={12} /> : <Users size={12} />}
          <span>{isVisit ? '와드 방문' : '접견'}</span>
        </div>
        <p className={styles.unit}>{unitName}</p>
        <p className={styles.time}>{schedule.startTime} – {schedule.endTime}</p>
      </div>
    </div>
  )
}
