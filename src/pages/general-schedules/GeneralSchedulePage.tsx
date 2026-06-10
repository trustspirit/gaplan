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
} from '@/services/generalScheduleService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import {
  GeneralEventItem,
  GeneralScheduleFormModal,
  GeneralScheduleDetailSheet,
} from '@/components/domain'
import type { GeneralSchedule } from '@/types'
import styles from './GeneralSchedulePage.module.scss'

export function GeneralSchedulePage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { allGeneralSchedules, loading } = useGeneralSchedules()
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
    <AppShell
      role={user.role}
      name={user.name}
      topBar={<TopBar name={user.name} subtext={t('generalSchedule.subtext')} />}
    >
      <div className={styles.page}>
        <Card>
          <CardHeader
            title={t('generalSchedule.pageTitle')}
            action={
              <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                + {t('generalSchedule.addBtn')}
              </Button>
            }
          />
          <CardBody>
            {loading && <p className={styles.empty}>불러오는 중…</p>}
            {!loading && allGeneralSchedules.length === 0 && (
              <p className={styles.empty}>{t('generalSchedule.empty')}</p>
            )}
            {allGeneralSchedules.map(gs => {
              const attendance = myAttendances.find(a => a.generalScheduleId === gs.id)
              return (
                <GeneralEventItem
                  key={gs.id}
                  event={gs}
                  isAttending={!!attendance}
                  canAttend={user.role === 'admin' || user.role === 'seventy'}
                  onAttend={() => handleAttend(gs.id)}
                  onCancelAttend={() => attendance && handleCancelAttend(attendance.id)}
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
    </AppShell>
  )
}
