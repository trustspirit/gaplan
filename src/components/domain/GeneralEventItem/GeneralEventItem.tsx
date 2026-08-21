import { Building2, MoonStar, CalendarDays, Check, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { GeneralSchedule } from '@/types'
import { DataList, type DataListRow } from '@/components/ui'
import { toGeneralEventRow } from './generalEventRow'
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
  const Icon = CATEGORY_ICONS[event.category]

  const badges = (
    <span className={styles.typeBadge}>
      <Icon size={11} />
      <span>{t(`generalSchedule.category.${event.category}`)}</span>
    </span>
  )

  const actions = (
    <>
      {canToggleVisibility && (
        <button
          type="button"
          className={clsx(styles.visibilityBtn, !event.isPublic && styles.hidden)}
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility?.()
          }}
          aria-label={
            event.isPublic ? t('generalSchedule.hideFromPublic') : t('generalSchedule.showToPublic')
          }
          title={
            event.isPublic ? t('generalSchedule.hideFromPublic') : t('generalSchedule.showToPublic')
          }
        >
          {event.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      )}
      {canAttend && (
        <button
          type="button"
          className={clsx(styles.attendBtn, isAttending && styles.attending)}
          onClick={(e) => {
            e.stopPropagation()
            if (isAttending) onCancelAttend()
            else onAttend()
          }}
          aria-label={isAttending ? t('generalSchedule.cancelAttend') : t('generalSchedule.attend')}
        >
          {isAttending ? (
            <>
              <Check size={12} strokeWidth={3} /> {t('generalSchedule.attending')}
            </>
          ) : (
            t('generalSchedule.attend')
          )}
        </button>
      )}
    </>
  )

  const row: DataListRow = {
    ...toGeneralEventRow({ event, today: dayjs().format('YYYY-MM-DD') }),
    badges,
    actions,
    onClick,
  }

  return <DataList rows={[row]} aria-label={row.title} />
}
