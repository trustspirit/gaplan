import { useState, useRef, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { BottomSheet, Skeleton } from '@/components/ui'
import { useIsMobile } from '@/hooks/useIsMobile'
import { authUserAtom } from '@/store/authAtom'
import { isRemindersEligible } from '@/utils/reminders'
import { remindersAtom, reminderDismissAtom, reminderLoadAtom } from '@/store/remindersAtom'
import { RemindersList } from '@/components/domain/Reminders/RemindersList'
import styles from './RemindersBell.module.scss'

export function RemindersBell() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)
  const { hasPending, presenceLoading, interviewReminders, meetingReminders, loaded, loading } =
    useAtomValue(remindersAtom)
  const dismiss = useAtomValue(reminderDismissAtom)
  const loadFull = useAtomValue(reminderLoadAtom)
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

  // 리마인더 대상 역할이면 건수와 무관하게 벨을 항상 렌더한다. 예전처럼 hasPending으로
  // 벨 자체를 감추면 presence 조회가 끝나는 순간 툭 나타나며 상단바가 밀린다.
  if (!isRemindersEligible(user)) return null

  const isEmpty = loaded && interviewReminders.length + meetingReminders.length === 0
  const list =
    presenceLoading || (!loaded && loading) ? (
      <div className={styles.skeletonList}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} height="20px" />
        ))}
      </div>
    ) : isEmpty ? (
      <p className={styles.empty}>{t('reminder.none')}</p>
    ) : !loaded ? (
      // presence는 끝났지만 전체 목록 로드에 실패한 상태 — 다시 시도할 수 있게 한다.
      <button type="button" className={styles.retry} onClick={() => loadFull?.()}>
        {t('common.retry')}
      </button>
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
        onClick={() => { setOpen(v => !v); loadFull?.() }}
        aria-label={t('reminder.bellLabel')}
      >
        <Bell size={18} />
        {hasPending && !presenceLoading && <span className={styles.dot} aria-hidden />}
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
