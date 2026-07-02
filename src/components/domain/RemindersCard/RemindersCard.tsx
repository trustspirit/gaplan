import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardBody, Skeleton } from '@/components/ui'
import { RemindersList } from '@/components/domain/Reminders/RemindersList'
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
        <RemindersList
          interviewReminders={interviewReminders}
          meetingReminders={meetingReminders}
          onDismiss={onDismiss}
        />
      </CardBody>
    </Card>
  )
}
