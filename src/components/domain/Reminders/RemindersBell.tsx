import { useState, useRef, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { BottomSheet } from '@/components/ui'
import { useIsMobile } from '@/hooks/useIsMobile'
import { remindersAtom, reminderCountAtom, reminderDismissAtom } from '@/store/remindersAtom'
import { RemindersList } from '@/components/domain/Reminders/RemindersList'
import styles from './RemindersBell.module.scss'

export function RemindersBell() {
  const { t } = useTranslation()
  const count = useAtomValue(reminderCountAtom)
  const { interviewReminders, meetingReminders } = useAtomValue(remindersAtom)
  const dismiss = useAtomValue(reminderDismissAtom)
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || isMobile) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open, isMobile])

  if (count === 0) return null

  const isEmpty = interviewReminders.length === 0 && meetingReminders.length === 0

  const list = isEmpty ? (
    <p className={styles.empty}>{t('reminder.empty')}</p>
  ) : (
    <RemindersList
      interviewReminders={interviewReminders}
      meetingReminders={meetingReminders}
      onDismiss={key => dismiss?.(key)}
    />
  )

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.bellBtn}
        onClick={() => setOpen(v => !v)}
        aria-label={t('reminder.bellLabel', { count })}
      >
        <Bell size={18} />
        <span className={styles.badge}>{count}</span>
      </button>

      {open && !isMobile && (
        <div className={clsx(styles.dropdown)}>
          <div className={styles.dropdownTitle}>{t('reminder.panelTitle')}</div>
          {list}
        </div>
      )}

      {isMobile && (
        <BottomSheet open={open} onClose={() => setOpen(false)} title={t('reminder.panelTitle')}>
          {list}
        </BottomSheet>
      )}
    </div>
  )
}
