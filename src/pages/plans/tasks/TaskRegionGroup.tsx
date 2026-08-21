import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { REGIONS } from '@/constants/regions'
import { Card, CardHeader, CardBody, Badge } from '@/components/ui'
import { ResponseMatrix } from '@/components/domain/ResponseMatrix/ResponseMatrix'
import { ScheduleSuggestions } from '@/components/domain/ScheduleSuggestions/ScheduleSuggestions'
import type { AppUser, GeneralSchedule, Task } from '@/types'
import { TaskRow } from './TaskRow'
import { interviewBatches } from './taskGrouping'
import styles from './tasks.module.scss'

interface TaskRegionGroupProps {
  regionId: string
  tasks: Task[]
  getUserName: (uid: string) => string
  getUnitName: (uid: string) => string
  generalSchedules?: GeneralSchedule[]
  currentUser?: AppUser
  onDeleteTask?: (task: Task) => void
}

export function TaskRegionGroup({
  regionId,
  tasks,
  getUserName,
  getUnitName,
  generalSchedules,
  currentUser,
  onDeleteTask,
}: TaskRegionGroupProps) {
  const { t } = useTranslation()
  const regionName = REGIONS.find((r) => r.id === regionId)?.name ?? regionId
  const responded = tasks.filter((x) => x.status === 'responded')
  const pending = tasks.filter((x) => x.status === 'pending')
  const completed = tasks.filter((x) => x.status === 'completed')
  const expired = tasks.filter((x) => x.status === 'expired')
  const visitResponded = responded.filter((x) => x.type === 'select_visit')
  const visitCompleted = completed.filter((x) => x.type === 'select_visit')
  const matrixBatches = interviewBatches(tasks)

  const renderRows = (list: Task[]) =>
    list.map((x) => (
      <TaskRow
        key={x.id}
        task={x}
        presidentName={getUserName(x.assignedTo)}
        unitName={getUnitName(x.assignedTo)}
        onDeleteTask={onDeleteTask}
      />
    ))

  return (
    <Card>
      <CardHeader
        title={regionName}
        action={
          <div className={styles.regionSummary}>
            {responded.length > 0 && (
              <Badge variant="default">
                {t('taskProgress.respondedBadge', { count: responded.length })}
              </Badge>
            )}
            {pending.length > 0 && (
              <Badge variant="warning">
                {t('taskProgress.pendingBadge', { count: pending.length })}
              </Badge>
            )}
            {completed.length > 0 && (
              <Badge variant="success">
                {t('taskProgress.completedBadge', { count: completed.length })}
              </Badge>
            )}
          </div>
        }
      />
      <CardBody>
        {tasks.length === 0 ? (
          <p className={styles.empty}>{t('taskProgress.emptyRegion')}</p>
        ) : (
          <>
            {matrixBatches.map((batch) => {
              const ref = batch[0]
              const title = ref.title ?? t(`task.type.${ref.type}`, { defaultValue: ref.type })
              return (
                <div key={ref.batchId ?? ref.id} className={styles.statusSection}>
                  <p className={styles.statusLabel}>
                    {t('taskProgress.responseStatus', {
                      title,
                      responded: batch.filter(
                        (b) => b.status === 'responded' || b.status === 'completed',
                      ).length,
                      total: batch.length,
                    })}
                  </p>
                  <ResponseMatrix tasks={batch} getPresidentName={getUserName} />
                  <div className={styles.suggestionsWrap}>
                    <ScheduleSuggestions
                      tasks={batch}
                      getPresidentName={getUserName}
                      generalSchedules={generalSchedules}
                      currentUser={currentUser}
                    />
                  </div>
                </div>
              )
            })}

            {visitResponded.length > 0 && (
              <div className={styles.statusSection}>
                <p className={styles.statusLabel}>
                  {t('taskProgress.awaitingConfirm', { count: visitResponded.length })}
                </p>
                {renderRows(visitResponded)}
              </div>
            )}
            {pending.length > 0 && (
              <div className={styles.statusSection}>
                <p className={styles.statusLabel}>
                  {t('taskProgress.noResponse', { count: pending.length })}
                </p>
                {renderRows(pending)}
              </div>
            )}
            {visitCompleted.length > 0 && (
              <div className={styles.statusSection}>
                <p className={styles.statusLabel}>
                  {t('taskProgress.completedCount', { count: visitCompleted.length })}
                </p>
                {renderRows(visitCompleted)}
              </div>
            )}
            {expired.length > 0 && (
              <div className={styles.statusSection}>
                <p className={clsx(styles.statusLabel, styles.statusLabelExpired)}>
                  {t('taskProgress.expiredCount', { count: expired.length })}
                </p>
                {renderRows(expired)}
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}
