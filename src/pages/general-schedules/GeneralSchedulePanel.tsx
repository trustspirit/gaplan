import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useGeneralSchedules } from '@/hooks/useGeneralSchedules'
import { useSchedules } from '@/hooks/useSchedules'
import {
  deleteGeneralSchedule,
  registerAttendance,
  cancelAttendance,
  updateGeneralSchedule,
} from '@/services/generalScheduleService'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import {
  GeneralEventItem,
  GeneralScheduleFormModal,
  GeneralScheduleDetailSheet,
} from '@/components/domain'
import type { GeneralSchedule } from '@/types'
import styles from './GeneralSchedulePage.module.scss'

export function GeneralSchedulePanel() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { generalSchedules, allGeneralSchedules, loading } = useGeneralSchedules()
  const visibleSchedules = user.role === 'admin' ? allGeneralSchedules : generalSchedules
  const { schedules } = useSchedules({})

  const [formOpen, setFormOpen]         = useState(false)
  const [editTarget, setEditTarget]     = useState<GeneralSchedule | null>(null)
  const [detailTarget, setDetailTarget] = useState<GeneralSchedule | null>(null)

  const handleAttend = async (gsId: string) => {
    try {
      await registerAttendance(gsId)
      toast.success(t('generalSchedule.attendSuccess'))
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? '참석 등록에 실패했습니다.')
    }
  }

  const handleCancelAttend = async (scheduleId: string) => {
    try {
      await cancelAttendance(scheduleId)
      toast.success(t('generalSchedule.cancelSuccess'))
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? '참석 취소에 실패했습니다.')
    }
  }

  const handleToggleVisibility = async (gs: GeneralSchedule) => {
    try {
      await updateGeneralSchedule(gs.id, { isPublic: !gs.isPublic })
    } catch {
      toast.error('공개 설정 변경에 실패했습니다.')
    }
  }

  const handleDelete = async (gs: GeneralSchedule) => {
    if (!confirm(t('generalSchedule.deleteConfirm'))) return
    try {
      await deleteGeneralSchedule(gs.id)
      toast.success(t('generalSchedule.deletedSuccess'))
      setDetailTarget(null)
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
  }

  const myAttendances = schedules.filter(
    s => s.type === 'general_attendance' && s.seventyUid === user.uid,
  )

  const detailAttendances = detailTarget
    ? schedules.filter(s => s.type === 'general_attendance' && s.generalScheduleId === detailTarget.id)
    : []

  return (
    <>
      <div className={styles.page}>
        <Card>
          <CardHeader
            title={t('generalSchedule.pageTitle')}
            action={
              (user.role === 'admin' || user.role === 'seventy') && (
                <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                  + {t('generalSchedule.addBtn')}
                </Button>
              )
            }
          />
          <CardBody>
            {loading && <p className={styles.empty}>불러오는 중…</p>}
            {!loading && visibleSchedules.length === 0 && (
              <p className={styles.empty}>{t('generalSchedule.empty')}</p>
            )}
            {visibleSchedules.map(gs => {
              const attendance = myAttendances.find(a => a.generalScheduleId === gs.id)
              return (
                <GeneralEventItem
                  key={gs.id}
                  event={gs}
                  isAttending={!!attendance}
                  canAttend={user.role === 'admin' || user.role === 'seventy'}
                  canToggleVisibility={user.role === 'admin'}
                  onAttend={() => handleAttend(gs.id)}
                  onCancelAttend={() => attendance && handleCancelAttend(attendance.id)}
                  onToggleVisibility={() => handleToggleVisibility(gs)}
                  onClick={() => setDetailTarget(gs)}
                />
              )
            })}
          </CardBody>
        </Card>
      </div>

      {formOpen && (
        <GeneralScheduleFormModal
          onClose={() => setFormOpen(false)}
          onSaved={() => setFormOpen(false)}
        />
      )}

      {editTarget && (
        <GeneralScheduleFormModal
          initialData={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}

      <GeneralScheduleDetailSheet
        event={detailTarget}
        attendances={detailAttendances}
        currentUid={user.uid}
        currentRole={user.role}
        onClose={() => setDetailTarget(null)}
        onAttend={async () => {
          if (!detailTarget) return
          await handleAttend(detailTarget.id)
        }}
        onCancelAttend={async () => {
          const a = myAttendances.find(x => x.generalScheduleId === detailTarget?.id)
          if (a) await handleCancelAttend(a.id)
        }}
        onEdit={() => { setEditTarget(detailTarget); setDetailTarget(null) }}
        onDelete={() => detailTarget && handleDelete(detailTarget)}
      />
    </>
  )
}
