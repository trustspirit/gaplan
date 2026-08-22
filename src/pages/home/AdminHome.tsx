import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { Globe, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { authUserAtom } from '@/store/authAtom'
import { seventyViewAtom } from '@/store/seventyViewAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { useDeleteWithUndo } from '@/hooks/useDeleteWithUndo'
import { useTopBar } from '@/hooks/useTopBar'
import { deleteScheduleViaCF } from '@/services/scheduleService'
import { resolveScopedScheduleSeventyUid } from '@/utils/scope'
import { selectGlanceSchedules } from '@/utils/glance'
import { ROUTES } from '@/router/routes'
import { Button } from '@/components/ui'
import { ScheduleFormModal } from '@/components/domain/ScheduleFormModal/ScheduleFormModal'
import { EditScheduleModal } from '@/components/domain/EditScheduleModal/EditScheduleModal'
import type { Schedule } from '@/types'
import { ScheduleListCard } from './ScheduleListCard'
import styles from './HomePage.module.scss'

/**
 * 관리자 홈. 스펙 §4.6 — 리마인더 배너 아래에 다가오는 일정, 그 머리에
 * 공개 링크와 새 일정 두 액션. 판정 R41에 따라 지표 타일은 두지 않는다.
 */
export function AdminHome() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const navigate = useNavigate()
  const viewSeventyUid = useAtomValue(seventyViewAtom)
  const scheduleSeventyUid = resolveScopedScheduleSeventyUid(user, viewSeventyUid)
  useTopBar({ subtext: t('admin.dashboard'), helpInfoKey: 'pageHelp.dashboardAdmin' })
  const { schedules, loading: schedulesLoading } = useSchedules(
    scheduleSeventyUid ? { seventyUid: scheduleSeventyUid } : {},
  )
  const { getUnitName } = useUnits()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const { pendingIds: deletingIds, scheduleDelete } = useDeleteWithUndo()
  const [schedulePublic, setSchedulePublic] = useState(false)
  const [publicCopied, setPublicCopied] = useState(false)
  const [globalToken, setGlobalToken] = useState<string | null>(null)

  const publicUrl = globalToken ? `${window.location.origin}/public/schedule/${globalToken}` : null

  useEffect(() => {
    getDoc(doc(db, 'settings', 'public')).then((snap) => {
      const data = snap.data()
      setSchedulePublic(data?.schedulePublic === true)
      if (data?.globalToken) setGlobalToken(data.globalToken as string)
    })
  }, [])

  const handlePublicAction = () => {
    if (schedulePublic && publicUrl) {
      navigator.clipboard.writeText(publicUrl).then(() => {
        setPublicCopied(true)
        toast.success(t('common.copyLink'))
        setTimeout(() => setPublicCopied(false), 2000)
      })
    } else if (schedulePublic && !publicUrl) {
      toast.info(t('common.publicLinkMissing'))
      navigate(ROUTES.settingsSharing)
    } else {
      navigate(ROUTES.settingsSharing)
    }
  }

  const today = dayjs().format('YYYY-MM-DD')
  const upcoming = selectGlanceSchedules(
    schedules.filter((s) => !deletingIds.has(s.id)),
    today,
  )

  return (
    <>
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <ScheduleListCard
            schedules={upcoming}
            loading={schedulesLoading}
            action={
              <div className={styles.headerActions}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePublicAction}
                  title={schedulePublic ? t('common.copyLink') : t('admin.publicScheduleTitle')}
                >
                  {publicCopied ? <Check size={14} /> : <Globe size={14} />}
                  &nbsp;{t('common.publicLink')}
                </Button>
                <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                  + {t('schedule.newTitle')}
                </Button>
              </div>
            }
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

      {formOpen && (
        <ScheduleFormModal
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            toast.success(t('schedule.savedSuccess'))
          }}
        />
      )}
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
