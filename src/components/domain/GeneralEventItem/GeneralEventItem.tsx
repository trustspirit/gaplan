import { Building2, MoonStar, CalendarDays, Check, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { GeneralSchedule } from '@/types'
import { DOW_LABELS } from '@/utils/date'
import styles from './GeneralEventItem.module.scss'

const CATEGORY_ICONS = {
  conference: Building2,
  fasting: MoonStar,
  other: CalendarDays,
} as const

interface GeneralEventItemProps {
  event: GeneralSchedule
  isAttending: boolean
  canAttend: boolean
  canToggleVisibility?: boolean
  onAttend: () => void
  onCancelAttend: () => void
  onToggleVisibility?: () => void
  onClick: () => void
}

export function GeneralEventItem({
  event,
  isAttending,
  canAttend,
  canToggleVisibility,
  onAttend,
  onCancelAttend,
  onToggleVisibility,
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

      <div className={styles.actions}>
        {canToggleVisibility && (
          <button
            type="button"
            className={clsx(styles.visibilityBtn, !event.isPublic && styles.hidden)}
            onClick={e => { e.stopPropagation(); onToggleVisibility?.() }}
            aria-label={event.isPublic ? t('generalSchedule.hideFromPublic') : t('generalSchedule.showToPublic')}
            title={event.isPublic ? t('generalSchedule.hideFromPublic') : t('generalSchedule.showToPublic')}
          >
            {event.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
        {canAttend && (
          <button
            type="button"
            className={clsx(styles.attendBtn, isAttending && styles.attending)}
            onClick={e => {
              e.stopPropagation()
              if (isAttending) onCancelAttend()
              else onAttend()
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
    </div>
  )
}
