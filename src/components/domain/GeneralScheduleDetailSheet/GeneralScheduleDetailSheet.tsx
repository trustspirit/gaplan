import { useState } from 'react'
import { Building2, MoonStar, CalendarDays, Clock, Globe, GlobeLock, Check, Pencil, Trash2 } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BottomSheet } from '@/components/ui/BottomSheet/BottomSheet'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button, DeleteConfirmSheet } from '@/components/ui'
import type { GeneralSchedule, Schedule } from '@/types'
import styles from './GeneralScheduleDetailSheet.module.scss'

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const CATEGORY_ICONS = {
  conference: Building2,
  fasting: MoonStar,
  other: CalendarDays,
} as const

interface GeneralScheduleDetailSheetProps {
  event: GeneralSchedule | null
  attendances: Schedule[]
  currentUid: string
  currentRole: string
  onClose: () => void
  onAttend: () => void
  onCancelAttend: () => void
  onEdit: () => void
  onDelete: () => void
}

export function GeneralScheduleDetailSheet({
  event,
  attendances,
  currentUid,
  currentRole,
  onClose,
  onAttend,
  onCancelAttend,
  onEdit,
  onDelete,
}: GeneralScheduleDetailSheetProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!event) return null

  const isAttending = attendances.some(a => a.seventyUid === currentUid)
  const canManage = currentRole === 'admin' || event.createdBy === currentUid
  const canAttend = currentRole === 'admin' || currentRole === 'seventy'
  const date = dayjs(event.date)
  const Icon = CATEGORY_ICONS[event.category]

  const content = (
    <div className={styles.content}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Icon size={18} className={styles.categoryIcon} />
          <h2 className={styles.title}>{event.title}</h2>
        </div>
        {canManage && (
          <div className={styles.actions}>
            <button type="button" className={styles.actionBtn} onClick={onEdit} aria-label="편집">
              <Pencil size={15} />
            </button>
            <button type="button" className={clsx(styles.actionBtn, styles.deleteBtn)} onClick={() => setShowDeleteConfirm(true)} aria-label="삭제">
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      <div className={styles.meta}>
        <span className={clsx(styles.categoryBadge, styles[event.category])}>
          {t(`generalSchedule.category.${event.category}`)}
        </span>
        {event.isPublic
          ? <span className={styles.publicBadge}><Globe size={11} /> 공개</span>
          : <span className={styles.privateBadge}><GlobeLock size={11} /> 비공개</span>
        }
      </div>

      <div className={styles.infoRow}>
        <CalendarDays size={14} className={styles.infoIcon} />
        <span>{date.format('YYYY년 M월 D일')} ({DOW_LABELS[date.day()]})</span>
      </div>
      {event.startTime && event.endTime && (
        <div className={styles.infoRow}>
          <Clock size={14} className={styles.infoIcon} />
          <span>{event.startTime} – {event.endTime}</span>
        </div>
      )}
      {event.description && (
        <p className={styles.description}>{event.description}</p>
      )}

      <div className={styles.attendeesSection}>
        <p className={styles.attendeesLabel}>
          {attendances.length > 0
            ? t('generalSchedule.attendees', { count: attendances.length })
            : t('generalSchedule.noAttendees')}
        </p>
        {attendances.length > 0 && (
          <div className={styles.attendeesList}>
            {attendances.map(a => (
              <span key={a.id} className={styles.attendeeChip}>
                {a.seventyUid === currentUid ? `${a.customTitle ?? a.seventyUid} (나)` : (a.customTitle ?? a.seventyUid)}
              </span>
            ))}
          </div>
        )}
      </div>

      {canAttend && (
        <div className={styles.attendRow}>
          <Button
            variant={isAttending ? 'secondary' : 'primary'}
            onClick={isAttending ? onCancelAttend : onAttend}
          >
            {isAttending ? (
              <><Check size={14} /> {t('generalSchedule.attending')} · {t('generalSchedule.cancelAttend')}</>
            ) : (
              t('generalSchedule.attend')
            )}
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {isMobile ? (
        <BottomSheet open={!!event} onClose={onClose} title="">
          {content}
        </BottomSheet>
      ) : (
        <Modal open={!!event} onClose={onClose}>
          {content}
        </Modal>
      )}
      <DeleteConfirmSheet
        open={showDeleteConfirm}
        description={event.title}
        onConfirm={() => { setShowDeleteConfirm(false); onDelete() }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
