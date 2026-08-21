import { useId, useState } from 'react'
import { useAtomValue } from 'jotai'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { authUserAtom } from '@/store/authAtom'
import { useAllTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useGeneralSchedules } from '@/hooks/useGeneralSchedules'
import { useDeleteWithUndo } from '@/hooks/useDeleteWithUndo'
import { deleteTask } from '@/services/taskService'
import { canUseAdminTools } from '@/utils/permissions'
import { ALL_UNITS } from '@/constants/regions'
import { Card, CardBody, EmptyState, LoadingState } from '@/components/ui'
import type { Task } from '@/types'
import { TaskRegionGroup } from './TaskRegionGroup'
import { TaskCreationForm } from './TaskCreationForm'
import { countByStatus, groupTasksByRegion, orderedRegionIds } from './taskGrouping'
import styles from './tasks.module.scss'

export function TaskPanel() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const [creating, setCreating] = useState(false)
  // aria-controls는 실제로 존재하는 id를 가리켜야 한다. 같은 화면에 패널이
  // 두 번 마운트돼도 id가 겹치지 않도록 useId로 받는다.
  const formRegionId = useId()
  const canCreate = canUseAdminTools(user)
  // 칠십인은 자기에게 배정된 Task만, 집행서기는 담당 칠십인의 Task만, 관리자는 전부.
  const { tasks, loading } = useAllTasks(
    user.role === 'seventy'
      ? user.uid
      : user.role === 'exec_secretary'
        ? (user.assignedSeventyUid ?? undefined)
        : undefined,
  )
  const { users } = useUsers()
  const { generalSchedules } = useGeneralSchedules()
  const { pendingIds: pendingDeleteTaskIds, scheduleDelete } = useDeleteWithUndo()
  const canDeleteTasks = user.role === 'admin' || user.role === 'exec_secretary'

  const getUserName = (uid: string) => users.find((u) => u.uid === uid)?.name ?? uid
  const getUnitName = (uid: string) => {
    const president = users.find((u) => u.uid === uid)
    const unit = ALL_UNITS.find((u) => u.id === president?.unitId)
    return unit?.name.ko ?? '-'
  }

  const visibleTasks = tasks.filter((x) => !pendingDeleteTaskIds.has(x.id))
  const totals = countByStatus(visibleTasks)
  const tasksByRegion = groupTasksByRegion(visibleTasks)
  const regionIds = orderedRegionIds(tasksByRegion)

  const handleDeleteTask = (task: Task) => {
    scheduleDelete(task.id, () => deleteTask(task.id), t('common.deleted'))
  }

  return (
    <div className={styles.panel}>
      {canCreate && (
        <div className={styles.createBlock}>
          <button
            type="button"
            className={styles.createToggle}
            aria-expanded={creating}
            aria-controls={formRegionId}
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {creating ? t('plans.createTaskClose') : t('plans.createTask')}
          </button>
          {/* 영역 자체는 접혀 있을 때 렌더하지 않는다 — TimePainterPicker가
              보이지 않는 동안에도 시간 격자를 계산하기 때문이다. */}
          {creating && (
            <div id={formRegionId} className={styles.createRegion}>
              <TaskCreationForm onCreated={() => setCreating(false)} />
            </div>
          )}
        </div>
      )}

      <div className={styles.summary} data-testid="task-summary">
        <div className={styles.summaryItem}>
          <span
            className={clsx(styles.summaryNum, styles.summaryNumResponded)}
            data-testid="total-responded"
          >
            {totals.responded}
          </span>
          <span className={styles.summaryLabel}>{t('taskProgress.summaryAwaiting')}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum} data-testid="total-pending">
            {totals.pending}
          </span>
          <span className={styles.summaryLabel}>{t('taskProgress.summaryPending')}</span>
        </div>
        <div className={styles.summaryItem}>
          <span
            className={clsx(styles.summaryNum, styles.summaryNumDone)}
            data-testid="total-completed"
          >
            {totals.completed}
          </span>
          <span className={styles.summaryLabel}>{t('common.complete')}</span>
        </div>
        <div className={styles.summaryItem}>
          <span
            className={clsx(styles.summaryNum, styles.summaryNumExpired)}
            data-testid="total-expired"
          >
            {totals.expired}
          </span>
          <span className={styles.summaryLabel}>{t('taskProgress.expire')}</span>
        </div>
      </div>

      {loading ? (
        <LoadingState shape="card" rows={3} />
      ) : visibleTasks.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState title={t('taskProgress.emptyTasks')} />
          </CardBody>
        </Card>
      ) : (
        regionIds.map((regionId) => (
          <TaskRegionGroup
            key={regionId}
            regionId={regionId}
            tasks={tasksByRegion[regionId]}
            getUserName={getUserName}
            getUnitName={getUnitName}
            generalSchedules={generalSchedules}
            currentUser={user}
            onDeleteTask={canDeleteTasks ? handleDeleteTask : undefined}
          />
        ))
      )}
    </div>
  )
}
