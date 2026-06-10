import { Building2, MoonStar, CalendarDays, Check } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { GeneralSchedule } from '@/types'
import styles from './GeneralEventItem.module.scss'

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const CATEGORY_ICONS = {
  conference: Building2,
  fasting: MoonStar,
  other: CalendarDays,
} as const

interface GeneralEventItemProps {
  event: GeneralSchedule
  isAttending: boolean
  canAttend: boolean
  onAttend: () => void
  onCancelAttend: () => void
  onClick: () => void
}

export function GeneralEventItem({
  event,
  isAttending,
  canAttend,
  onAttend,
  onCancelAttend,
  onClick,
}: GeneralEventItemProps) {
  const { t } = useTranslation()
  const date = dayjs(event.date)
  const dow = DOW_LABELS[date.day()]
  const isPast = date.isBefore(dayjs(), 'day')
  const Icon = CATEGORY_ICONS[event.category]

  return (
    <div
      className={clsx(styles.wrapper, isPast && styles.past)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className={clsx(styles.colorBar, styles[event.category])} />

      <div className={clsx(styles.dateCol, styles[event.category])}>
        <span className={styles.date}>{date.format('M.D')}</span>
        <span className={styles.dow}>{dow}</span>
      </div>

      <div className={styles.body}>
        <div className={styles.typeBadge}>
          <Icon size={11} />
          <span>{t(`generalSchedule.category.${event.category}`)}</span>
        </div>
        <p className={styles.title}>{event.title}</p>
        {event.startTime && event.endTime && (
          <p className={styles.time}>{event.startTime} – {event.endTime}</p>
        )}
      </div>

      {canAttend && (
        <button
          type="button"
          className={clsx(styles.attendBtn, isAttending && styles.attending)}
          onClick={e => {
            e.stopPropagation()
            isAttending ? onCancelAttend() : onAttend()
          }}
          aria-label={isAttending ? t('generalSchedule.cancelAttend') : t('generalSchedule.attend')}
        >
          {isAttending ? (
            <><Check size={12} strokeWidth={3} /> {t('generalSchedule.attending')}</>
          ) : (
            t('generalSchedule.attend')
          )}
        </button>
      )}
    </div>
  )
}
