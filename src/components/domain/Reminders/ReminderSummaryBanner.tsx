import { useEffect, useState } from 'react'
import { useAtomValue } from 'jotai'
import { Bell, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { BottomSheet, Modal } from '@/components/ui'
import { useIsMobile } from '@/hooks/useIsMobile'
import { remindersAtom, reminderHasAtom, reminderDismissAtom, reminderLoadAtom } from '@/store/remindersAtom'
import { RemindersList } from '@/components/domain/Reminders/RemindersList'
import type { ReminderSeverity } from '@/utils/reminders'
import styles from './ReminderSummaryBanner.module.scss'

function topSeverity(sevs: ReminderSeverity[]): ReminderSeverity {
  if (sevs.includes('red')) return 'red'
  if (sevs.includes('amber')) return 'amber'
  return 'green'
}

export function ReminderSummaryBanner() {
  const { t } = useTranslation()
  const hasPending = useAtomValue(reminderHasAtom)
  const { interviewReminders, meetingReminders, loaded, loading } = useAtomValue(remindersAtom)
  const dismiss = useAtomValue(reminderDismissAtom)
  const loadFull = useAtomValue(reminderLoadAtom)
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  // 대시보드 글랜스는 리마인더를 즉시 보여주는 화면이므로, 마운트 시 전체 목록을 지연 로드한다.
  useEffect(() => {
    loadFull?.()
  }, [loadFull])

  if (!hasPending) return null

  // 로딩 중일 때만 비활성 스켈레톤을 보여준다.
  if (loading && !loaded) {
    return (
      <div className={clsx(styles.banner, styles.loading)}>
        <Bell size={16} />
        <span className={styles.text}>{t('common.loading')}</span>
      </div>
    )
  }

  // 아직 로드 전이거나 로드 실패(loadFull 예외)한 경우: 다시 시도할 수 있는 탭 가능한 프롬프트.
  if (!loaded) {
    return (
      <button type="button" className={styles.banner} onClick={() => loadFull?.()}>
        <Bell size={16} />
        <span className={styles.text}>{t('reminder.bellLabel')}</span>
        <ChevronRight size={16} className={styles.chevron} />
      </button>
    )
  }

  const count = interviewReminders.length + meetingReminders.length
  const severity = topSeverity(
    [...interviewReminders, ...meetingReminders].map(r => r.severity),
  )
  const list = (
    <RemindersList
      interviewReminders={interviewReminders}
      meetingReminders={meetingReminders}
      onDismiss={key => dismiss?.(key)}
    />
  )

  return (
    <>
      <button type="button" className={clsx(styles.banner, styles[severity])} onClick={() => setOpen(true)}>
        <Bell size={16} />
        <span className={styles.text}>{t('reminder.summaryBanner', { count })}</span>
        <ChevronRight size={16} className={styles.chevron} />
      </button>
      {isMobile ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title={t('reminder.panelTitle')}>
          {list}
        </BottomSheet>
      ) : (
        <Modal open={open} onClose={() => setOpen(false)} title={t('reminder.panelTitle')}>
          {list}
        </Modal>
      )}
    </>
  )
}
