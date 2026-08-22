import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { useDeleteWithUndo } from '@/hooks/useDeleteWithUndo'
import { useTopBar } from '@/hooks/useTopBar'
import { deleteScheduleViaCF } from '@/services/scheduleService'
import { selectGlanceSchedules } from '@/utils/glance'
import { REGIONS } from '@/constants/regions'
import { EditScheduleModal } from '@/components/domain/EditScheduleModal/EditScheduleModal'
import type { Schedule } from '@/types'
import { CalendarBanner } from './CalendarBanner'
import { ScheduleListCard } from './ScheduleListCard'
import styles from './HomePage.module.scss'

/**
 * 칠십인 홈. 스펙 §4.6 — 캘린더 배너와 리마인더 배너 아래에 다가오는 일정.
 * 판정 R41에 따라 지표 타일은 두지 않는다.
 */
export function SeventyHome() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { schedules, loading: schedulesLoading } = useSchedules({ seventyUid: user.uid })
  const { getUnitName } = useUnits()
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const { pendingIds: deletingIds, scheduleDelete } = useDeleteWithUndo()
  const regionIds = user.regionIds ?? (user.regionId ? [user.regionId] : [])
  const regionName = regionIds.map((id) => REGIONS.find((r) => r.id === id)?.name ?? id).join(', ')
  useTopBar({ subtext: regionName, helpInfoKey: 'pageHelp.dashboardSeventy' })

  const today = dayjs().format('YYYY-MM-DD')
  const upcoming = selectGlanceSchedules(
    schedules.filter((s) => !deletingIds.has(s.id)),
    today,
  )

  return (
    <>
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <CalendarBanner connected={user.calendarConnected} />


          <ScheduleListCard
            schedules={upcoming}
            loading={schedulesLoading}
            getUnitName={getUnitName}
            canEdit
            onEdit={setEditTarget}
            onDelete={(s) =>
              scheduleDelete(
                s.id,
                () => deleteScheduleViaCF(s.id),
                t('admin.scheduleCancelSuccess'),
              )
            }
          />
        </div>
      </div>

      {editTarget && (
        <EditScheduleModal
          schedule={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => toast.success(t('admin.scheduleEditSuccess'))}
          onDelete={() => {
            scheduleDelete(
              editTarget.id,
              () => deleteScheduleViaCF(editTarget.id),
              t('admin.scheduleCancelSuccess'),
            )
            setEditTarget(null)
          }}
        />
      )}
    </>
  )
}
