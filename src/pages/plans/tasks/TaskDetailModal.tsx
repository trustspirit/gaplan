import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui'
import type { Task } from '@/types'
import { StatusBadge } from './TaskStatusBadge'
import styles from './tasks.module.scss'

export function TaskDetailModal({
  task,
  presidentName,
  onClose,
}: {
  task: Task
  presidentName: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Modal open onClose={onClose} title={t('taskProgress.detailTitle')}>
      <div className={styles.modalBody}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{t('taskProgress.statusLabel')}</span>
          <StatusBadge status={task.status} />
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{t('taskProgress.assigneeLabel')}</span>
          <span className={styles.detailValue}>{presidentName}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>{t('taskProgress.dueDateLabel')}</span>
          <span className={styles.detailValue}>{task.dueDate}</span>
        </div>
        {task.note && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>{t('taskProgress.memoLabel')}</span>
            <span className={styles.detailValue}>{task.note}</span>
          </div>
        )}
        {task.respondedSlots && task.respondedSlots.length > 0 && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>{t('taskProgress.respondedTimes')}</div>
            {task.respondedSlots.map((slot, i) => (
              <div key={i} className={styles.detailSlotRow}>
                {slot.date} {slot.startTime}–{slot.endTime}
              </div>
            ))}
          </div>
        )}
        {task.wardAssignments && task.wardAssignments.length > 0 && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>{t('taskProgress.wardAssignments')}</div>
            {task.wardAssignments.map((wa, i) => (
              <div key={i} className={styles.detailSlotRow}>
                {wa.wardName}: {wa.date}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
