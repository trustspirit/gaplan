import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { Check } from 'lucide-react'
import { Card, CardHeader, CardBody, Skeleton } from '@/components/ui'
import type { InterviewReminder, MeetingReminder } from '@/utils/reminders'
import styles from './RemindersCard.module.scss'

interface Props {
  interviewReminders: InterviewReminder[]
  meetingReminders: MeetingReminder[]
  loading?: boolean
  onDismiss: (key: string) => void
}

export function RemindersCard({ interviewReminders, meetingReminders, loading, onDismiss }: Props) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <Card>
        <CardHeader title={t('reminder.title')} />
        <CardBody>
          <Skeleton height="20px" className={styles.skeletonRow} />
          <Skeleton height="20px" className={styles.skeletonRow} />
        </CardBody>
      </Card>
    )
  }
  if (interviewReminders.length === 0 && meetingReminders.length === 0) return null

  return (
    <Card>
      <CardHeader title={t('reminder.title')} />
      <CardBody>
        {interviewReminders.length > 0 && (
          <div className={styles.section}>
            <p className={styles.sectionTitle}>{t('reminder.quarterlyInterview')}</p>
            <ul className={styles.list}>
              {interviewReminders.map(r => (
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
              {meetingReminders.map(r => (
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
      </CardBody>
    </Card>
  )
}
