import { useState, useEffect, type ReactNode } from 'react'
import { useAtomValue } from 'jotai'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { Calendar, CheckCircle2, Globe, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { authUserAtom } from '@/store/authAtom'
import { useTasks } from '@/hooks/useTasks'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { useTaskConfirm } from '@/hooks/useTaskConfirm'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useScheduleDateRange } from '@/hooks/useScheduleDateRange'
import { useReminders } from '@/hooks/useReminders'
import { subscribeToSharedCalendar } from '@/services/calendarService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Skeleton, Button, Modal, BottomSheet } from '@/components/ui'
import {
  TaskCard,
  ScheduleItem,
  TaskPickerContent,
  taskPickerTitle,
  ScheduleDateRangeFilter,
  ScheduleFormModal,
  EditScheduleModal,
  RemindersCard,
} from '@/components/domain'
import type { Schedule } from '@/types'
import { useWardSubmit } from '@/hooks/useWardSubmit'
import { REGIONS } from '@/constants/regions'
import styles from './DashboardPage.module.scss'

const isConfirmedSchedule = (schedule: Schedule) => schedule.status === 'confirmed'

const sortSchedulesByDate = (a: Schedule, b: Schedule) =>
  a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)

const getUpcomingSchedules = (schedules: Schedule[]) =>
  schedules
    .filter(
      (schedule) =>
        isConfirmedSchedule(schedule) && dayjs(schedule.date).isAfter(dayjs().subtract(1, 'day')),
    )
    .sort(sortSchedulesByDate)

const getThisMonthScheduleCount = (schedules: Schedule[]) =>
  schedules.filter(
    (schedule) =>
      isConfirmedSchedule(schedule) &&
      dayjs(schedule.date).format('YYYY-M') === dayjs().format('YYYY-M'),
  ).length

function CalendarBanner({ connected }: { connected?: boolean }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    try {
      await subscribeToSharedCalendar()
      toast.success(t('schedule.calendarSuccess'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '연동에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.calendarBanner}>
      <Calendar size={16} color="var(--color-primary, #177C9C)" />
      <span className={styles.calendarBannerText}>{t('schedule.calendarBannerText')}</span>
      {connected ? (
        <div className={styles.calendarConnected}>
          <CheckCircle2 size={14} />
          {t('schedule.calendarConnected')}
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={handleConnect} loading={loading}>
          {t('schedule.calendarSubscribe')}
        </Button>
      )}
    </div>
  )
}

interface ScheduleListCardProps {
  schedules: Schedule[]
  loading?: boolean
  action?: ReactNode
  showCalendarAdd?: boolean
  canEdit?: boolean
  getUnitName: (unitId: string) => string
  onEdit?: (schedule: Schedule) => void
  onDelete?: (schedule: Schedule) => void
}

function ScheduleListCard({
  schedules,
  loading,
  action,
  showCalendarAdd,
  canEdit,
  getUnitName,
  onEdit,
  onDelete,
}: ScheduleListCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader title={t('schedule.upcoming')} action={action} />
      <CardBody>
        {loading ? (
          [1, 2].map((i) => <Skeleton key={i} height="44px" className={styles.skeletonItem} />)
        ) : schedules.length === 0 ? (
          <p className={styles.empty}>{t('schedule.noUpcoming')}</p>
        ) : (
          schedules.map((schedule) => (
            <ScheduleItem
              key={schedule.id}
              schedule={schedule}
              unitName={getUnitName(schedule.unitId)}
              showCalendarAdd={showCalendarAdd}
              canEdit={canEdit}
              onEdit={onEdit ? () => onEdit(schedule) : undefined}
              onDelete={onDelete ? () => onDelete(schedule) : undefined}
            />
          ))
        )}
      </CardBody>
    </Card>
  )
}

function PresidentDashboard() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { tasks, loading: tasksLoading } = useTasks(user.uid)
  const { schedules, loading: schedulesLoading } = useSchedules({ presidentUid: user.uid })
  const { getUnitName } = useUnits()
  const isMobile = useIsMobile()
  const { setting: rangeSetting, range, save: saveRange } = useScheduleDateRange(user.uid)
  const {
    activeTask,
    selectedSlots,
    toggleSlot,
    isSlotSelected,
    submitting,
    availableSlots,
    openTask,
    closeTask,
    handleSubmitAvailability,
  } = useTaskConfirm(user.uid, user.unitId)

  const { handleSubmitWards, wardSubmitting } = useWardSubmit(activeTask, closeTask)

  const upcoming = schedules
    .filter(s => s.status === 'confirmed' && s.date >= range.start && s.date <= range.end)
    .sort(sortSchedulesByDate)

  const pickerTitle = taskPickerTitle(activeTask)

  const pickerContent = activeTask ? (
    <TaskPickerContent
      activeTask={activeTask}
      user={user}
      availableSlots={availableSlots}
      isSlotSelected={isSlotSelected}
      onToggleSlot={toggleSlot}
      slotSubmitting={submitting}
      selectedSlots={selectedSlots}
      onSubmitAvailability={handleSubmitAvailability}
      onSubmitWards={handleSubmitWards}
      wardSubmitting={wardSubmitting}
    />
  ) : null

  return (
    <AppShell
      role={user.role}
      name={user.name}
      topBar={
        <TopBar
          name={user.name}
          subtext={dayjs().format('YYYY년 M월')}
          pendingCount={tasks.length}
          helpInfoKey="pageHelp.dashboardPresident"
        />
      }
    >
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <Card>
            <CardHeader title={t('task.needsAction')} />
            <CardBody>
              {tasksLoading ? (
                [1, 2].map((i) => (
                  <Skeleton key={i} height="44px" className={styles.skeletonItem} />
                ))
              ) : tasks.length === 0 ? (
                <p className={styles.empty}>{t('task.noTasks')}</p>
              ) : (
                tasks.map((t) => <TaskCard key={t.id} task={t} onAction={openTask} />)
              )}
            </CardBody>
          </Card>

          <ScheduleDateRangeFilter
            setting={rangeSetting}
            currentRange={range}
            onChange={saveRange}
          />
          <ScheduleListCard
            schedules={upcoming}
            loading={schedulesLoading}
            getUnitName={getUnitName}
            showCalendarAdd
          />
        </div>
      </div>

      {isMobile ? (
        <BottomSheet open={!!activeTask} onClose={closeTask} title={pickerTitle}>
          {pickerContent}
        </BottomSheet>
      ) : (
        <Modal open={!!activeTask} onClose={closeTask} title={pickerTitle}>
          {pickerContent}
        </Modal>
      )}
    </AppShell>
  )
}

function SeventyDashboard() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { schedules, loading: schedulesLoading } = useSchedules({ seventyUid: user.uid })
  const { interviewReminders, meetingReminders, dismiss } = useReminders()
  const { getUnitName } = useUnits()
  const { setting: rangeSetting, range, save: saveRange } = useScheduleDateRange(user.uid)
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)
  const regionIds = user.regionIds ?? (user.regionId ? [user.regionId] : [])
  const regionName = regionIds.map((id) => REGIONS.find((r) => r.id === id)?.name ?? id).join(', ')

  const upcoming = schedules
    .filter(s => s.status === 'confirmed' && s.date >= range.start && s.date <= range.end)
    .sort(sortSchedulesByDate)
  const thisMonthCount = getThisMonthScheduleCount(schedules)

  return (
    <AppShell
      role={user.role}
      name={user.name}
      topBar={<TopBar name={user.name} subtext={regionName} helpInfoKey="pageHelp.dashboardSeventy" />}
    >
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <CalendarBanner connected={user.calendarConnected} />

          <RemindersCard
            interviewReminders={interviewReminders}
            meetingReminders={meetingReminders}
            onDismiss={dismiss}
          />

          <ScheduleDateRangeFilter
            setting={rangeSetting}
            currentRange={range}
            onChange={saveRange}
          />
          <ScheduleListCard
            schedules={upcoming}
            loading={schedulesLoading}
            action={
              <span className={styles.headerCount}>
                {t('schedule.thisMonth', { count: thisMonthCount })}
              </span>
            }
            getUnitName={getUnitName}
            canEdit
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        </div>
      </div>

      {editTarget && (
        <EditScheduleModal
          schedule={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => toast.success(t('admin.scheduleEditSuccess'))}
        />
      )}
      {deleteTarget && (
        <EditScheduleModal
          schedule={deleteTarget}
          initialConfirmDelete
          onClose={() => setDeleteTarget(null)}
          onSaved={() => toast.success(t('admin.scheduleCancelSuccess'))}
        />
      )}
    </AppShell>
  )
}

function AdminDashboardContent() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const navigate = useNavigate()
  const { schedules, loading: schedulesLoading } = useSchedules({})
  const { interviewReminders, meetingReminders, dismiss } = useReminders()
  const { getUnitName } = useUnits()
  const { setting: rangeSetting, range, save: saveRange } = useScheduleDateRange(user.uid)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)
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
      navigate('/admin/calendar')
    } else {
      navigate('/admin/calendar')
    }
  }

  const thisMonthCount = getThisMonthScheduleCount(schedules)
  const upcoming = schedules
    .filter(
      (schedule) =>
        isConfirmedSchedule(schedule) && schedule.date >= range.start && schedule.date <= range.end,
    )
    .sort(sortSchedulesByDate)
    .slice(0, 8)

  return (
    <AppShell
      role={user.role}
      name={user.name}
      topBar={<TopBar name={user.name} subtext={t('admin.dashboard')} helpInfoKey="pageHelp.dashboardAdmin" />}
    >
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <RemindersCard
            interviewReminders={interviewReminders}
            meetingReminders={meetingReminders}
            onDismiss={dismiss}
          />
          <ScheduleDateRangeFilter
            setting={rangeSetting}
            currentRange={range}
            onChange={saveRange}
          />
          <ScheduleListCard
            schedules={upcoming}
            loading={schedulesLoading}
            action={
              <div className={styles.headerActions}>
                <span className={styles.headerCount}>
                  {t('schedule.thisMonth', { count: thisMonthCount })}
                </span>
                <Button variant="secondary" size="sm" onClick={handlePublicAction} title={schedulePublic ? t('common.copyLink') : t('admin.publicScheduleTitle')}>
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
            onDelete={setDeleteTarget}
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
        />
      )}
      {deleteTarget && (
        <EditScheduleModal
          schedule={deleteTarget}
          initialConfirmDelete
          onClose={() => setDeleteTarget(null)}
          onSaved={() => toast.success(t('admin.scheduleCancelSuccess'))}
        />
      )}
    </AppShell>
  )
}

export function DashboardPage() {
  const user = useAtomValue(authUserAtom)!
  if (user.role === 'seventy') return <SeventyDashboard />
  if (user.role === 'admin' || user.role === 'exec_secretary') return <AdminDashboardContent />
  return <PresidentDashboard />
}
