import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { Check } from 'lucide-react'
import type { InterviewReminder, MeetingReminder, ReminderSeverity } from '@/utils/reminders'
import styles from './RemindersList.module.scss'

const SEVERITY_RANK: Record<ReminderSeverity, number> = { red: 0, amber: 1, green: 2 }

export function sortBySeverity<T extends { severity: ReminderSeverity }>(items: T[]): T[] {
  return [...items].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}

interface Props {
  interviewReminders: InterviewReminder[]
  meetingReminders: MeetingReminder[]
  onDismiss: (key: string) => void
}

export function RemindersList({ interviewReminders, meetingReminders, onDismiss }: Props) {
  const { t } = useTranslation()
  if (interviewReminders.length === 0 && meetingReminders.length === 0) return null

  return (
    <>
      {interviewReminders.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>{t('reminder.quarterlyInterview')}</p>
          <ul className={styles.list}>
            {sortBySeverity(interviewReminders).map(r => (
              <li key={r.key} className={styles.row}>
                <span className={clsx(styles.dot, styles[r.severity])} />
                <span className={styles.text}>
                  {r.unitName} · {r.presidentName ?? t('reminder.noPresident')}
                </span>
                <button type="button" className={styles.dismiss} onClick={() => onDismiss(r.key)}>
                  <Check size={13} /> {t('reminder.acknowledge')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {meetingReminders.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>{t('reminder.preVisitMeeting')}</p>
          <ul className={styles.list}>
            {sortBySeverity(meetingReminders).map(r => (
              <li key={r.key} className={styles.row}>
                <span className={clsx(styles.dot, styles[r.severity])} />
                <span className={styles.text}>
                  {r.wardName} · {dayjs(r.visitDate).format('M.D')} · {t('reminder.meetingBy', { date: dayjs(r.meetingByDate).format('M.D') })}
                </span>
                <button type="button" className={styles.dismiss} onClick={() => onDismiss(r.key)}>
                  <Check size={13} /> {t('reminder.acknowledge')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
