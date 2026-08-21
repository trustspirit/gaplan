import { useMemo, useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useGeneralSchedules } from '@/hooks/useGeneralSchedules'
import { useUnits } from '@/hooks/useUnits'
import { useScheduleDateRange } from '@/hooks/useScheduleDateRange'
import { useDeleteWithUndo } from '@/hooks/useDeleteWithUndo'
import { useEffectiveScope } from '@/hooks/useEffectiveScope'
import { useTopBar } from '@/hooks/useTopBar'
import { manualCalendarSync, deleteScheduleViaCF } from '@/services/scheduleService'
import {
  registerAttendance,
  cancelAttendance,
  updateGeneralSchedule,
  deleteGeneralSchedule,
} from '@/services/generalScheduleService'
import {
  Button,
  LoadingState,
  PageHeader,
  SegmentedControl,
  type SegmentOption,
} from '@/components/ui'
import { ScheduleItem } from '@/components/domain/ScheduleItem/ScheduleItem'
import { GeneralEventItem } from '@/components/domain/GeneralEventItem/GeneralEventItem'
import { ScheduleFormModal } from '@/components/domain/ScheduleFormModal/ScheduleFormModal'
import { EditScheduleModal } from '@/components/domain/EditScheduleModal/EditScheduleModal'
import { GeneralScheduleFormModal } from '@/components/domain/GeneralScheduleFormModal/GeneralScheduleFormModal'
import { GeneralScheduleDetailSheet } from '@/components/domain/GeneralScheduleDetailSheet/GeneralScheduleDetailSheet'
import { REGIONS } from '@/constants/regions'
import { canUseAdminTools } from '@/utils/permissions'
import type { GeneralSchedule, Schedule } from '@/types'
import { ScheduleFilterBar } from './ScheduleFilterBar'
import { ScheduleCalendarPanel } from './ScheduleCalendarPanel'
import { ScheduleListPanel } from './ScheduleListPanel'
import { rowsToCsv, downloadCsv } from './scheduleCsv'
import {
  SCHEDULE_KINDS,
  buildBoardItems,
  eventMatchesRegion,
  filterByRegion,
  filterByStatus,
  kindOfScheduleType,
  scheduleMatchesRegion,
  scheduleQueryFor,
  type BoardItem,
  type ScheduleKind,
  type ScheduleStatusFilter,
} from './scheduleFilters'
import styles from './SchedulesPage.module.scss'

type BoardView = 'month' | 'week' | 'list'

export function SchedulesPage() {
  const { t } = useTranslation()
  useTopBar({ subtext: t('schedules.subtext'), helpInfoKey: 'pageHelp.schedules' })
  const user = useAtomValue(authUserAtom)!

  const [view, setView] = useState<BoardView>('month')
  const [kinds, setKinds] = useState<ScheduleKind[]>([...SCHEDULE_KINDS])
  const [regionId, setRegionId] = useState<string | null>(null)
  const [status, setStatus] = useState<ScheduleStatusFilter>('all')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const [detailTarget, setDetailTarget] = useState<GeneralSchedule | null>(null)
  // 상세 시트에서 「수정」을 누르면 같은 폼을 initialData와 함께 연다.
  const [eventEditTarget, setEventEditTarget] = useState<GeneralSchedule | null>(null)
  const [syncing, setSyncing] = useState(false)

  const query = useMemo(() => scheduleQueryFor(user), [user])
  const { schedules, loading } = useSchedules(query)
  const { generalSchedules } = useGeneralSchedules()
  const { getUnitName, getWardName } = useUnits()
  const { setting: rangeSetting, range, save: saveRange } = useScheduleDateRange(user.uid)
  const { pendingIds: deletingIds, scheduleDelete } = useDeleteWithUndo()
  const scope = useEffectiveScope()

  const today = dayjs().format('YYYY-MM-DD')
  const canManage = canUseAdminTools(user)

  const regions =
    scope.regionIds != null ? REGIONS.filter((r) => scope.regionIds!.includes(r.id)) : REGIONS

  // 종류·지역·기간까지 반영. 지표가 이걸 센다(판정 R27).
  const items = useMemo(
    () =>
      filterByRegion(
        buildBoardItems({
          schedules,
          generalSchedules,
          kinds,
          range,
          hiddenIds: deletingIds,
        }),
        regionId,
      ),
    [schedules, generalSchedules, kinds, range, deletingIds, regionId],
  )

  // 달력 격자는 병합 목록이 아니라 원본 두 벌을 받는다 — CalendarView가 그렇게 생겼다.
  // 종류·지역·삭제 대기(hiddenIds)는 목록(items)과 같은 규칙으로 반영한다.
  // 기간(range)만은 일부러 뺀다 — 격자는 스스로 월/주를 넘기므로, 범위 밖 달로
  // 넘어가면 격자만 텅 비는 걸 막기 위해서다(ScheduleCalendarPanel 주석 참고).
  const calendarSchedules = useMemo(
    () =>
      schedules.filter((s) => {
        const kind = kindOfScheduleType(s.type)
        if (kind == null || !kinds.includes(kind)) return false
        if (deletingIds.has(s.id)) return false
        return scheduleMatchesRegion(s, regionId)
      }),
    [schedules, kinds, deletingIds, regionId],
  )
  const calendarEvents = useMemo(
    () =>
      kinds.includes('event')
        ? generalSchedules.filter((e) => !deletingIds.has(e.id) && eventMatchesRegion(e, regionId))
        : [],
    [generalSchedules, kinds, deletingIds, regionId],
  )

  const myAttendances = schedules.filter(
    (s) => s.type === 'general_attendance' && s.seventyUid === user.uid,
  )

  const handleAttend = async (eventId: string) => {
    try {
      await registerAttendance(eventId)
      toast.success(t('generalSchedule.attendSuccess'))
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? t('generalSchedule.attendFailed'))
    }
  }

  const handleCancelAttend = async (scheduleId: string) => {
    try {
      await cancelAttendance(scheduleId)
      toast.success(t('generalSchedule.cancelSuccess'))
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? t('generalSchedule.cancelFailed'))
    }
  }

  const handleToggleVisibility = async (event: GeneralSchedule) => {
    try {
      await updateGeneralSchedule(event.id, { isPublic: !event.isPublic })
    } catch {
      toast.error(t('generalSchedule.visibilityFailed'))
    }
  }

  // 옛 CalendarPage는 여기서 "행사 일정 페이지에서 삭제할 수 있습니다"라는 하드코딩
  // 한글을 띄웠다. 그 페이지가 이제 이 페이지이므로 그 안내는 거짓말이 된다 —
  // GeneralSchedulePanel이 갖고 있던 진짜 삭제를 가져온다.
  const handleDeleteEvent = (event: GeneralSchedule) => {
    setDetailTarget(null)
    scheduleDelete(
      event.id,
      () => deleteGeneralSchedule(event.id),
      t('generalSchedule.deletedSuccess'),
    )
  }

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const result = await manualCalendarSync()
      toast.success(result.message)
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? t('common.syncError'))
    } finally {
      setSyncing(false)
    }
  }

  // 두 패널이 같은 행 표현을 쓰도록 렌더 함수를 한 곳에 둔다.
  const renderItem = (item: BoardItem) => {
    if (item.entry.source === 'event') {
      const event = item.entry.event
      const attendance = myAttendances.find((a) => a.generalScheduleId === event.id)
      return (
        <GeneralEventItem
          key={item.key}
          event={event}
          isAttending={!!attendance}
          canAttend={user.role === 'admin' || user.role === 'seventy'}
          canToggleVisibility={user.role === 'admin'}
          onAttend={() => handleAttend(event.id)}
          onCancelAttend={() => attendance && handleCancelAttend(attendance.id)}
          onToggleVisibility={() => handleToggleVisibility(event)}
          onClick={() => setDetailTarget(event)}
        />
      )
    }
    const schedule = item.entry.schedule
    return (
      <ScheduleItem
        key={item.key}
        schedule={schedule}
        unitName={getUnitName(schedule.unitId) || t('schedule.type.meeting')}
        showCalendarAdd={user.role === 'president'}
        canEdit={canManage || user.role === 'seventy'}
        onEdit={() => setEditTarget(schedule)}
        onDelete={() =>
          scheduleDelete(
            schedule.id,
            () => deleteScheduleViaCF(schedule.id),
            t('admin.scheduleCancelSuccess'),
          )
        }
      />
    )
  }

  const exportCsv = () => {
    const header = [
      t('calendar.csv.date'),
      t('calendar.csv.dow'),
      t('calendar.csv.type'),
      t('calendar.csv.title'),
      t('common.startTime'),
      t('common.endTime'),
    ]
    const rows = items.map((item) => {
      const dow = dayjs(item.date).format('ddd')
      if (item.entry.source === 'event') {
        const event = item.entry.event
        return [
          item.date,
          dow,
          t(`generalSchedule.category.${event.category}`),
          event.title,
          event.startTime ?? '',
          event.endTime ?? '',
        ]
      }
      const schedule = item.entry.schedule
      const title =
        schedule.customTitle ??
        (schedule.wardName
          ? `${getUnitName(schedule.unitId)} ${getWardName(schedule.wardName)}`
          : getUnitName(schedule.unitId))
      return [
        item.date,
        dow,
        t(`schedule.type.${schedule.type}`),
        title,
        schedule.startTime,
        schedule.endTime,
      ]
    })
    downloadCsv(
      t('calendar.csv.fileName', { start: range.start, end: range.end }),
      rowsToCsv([header, ...rows]),
    )
  }

  const viewOptions: SegmentOption<BoardView>[] = [
    { value: 'month', label: t('common.monthView') },
    { value: 'week', label: t('common.weekView') },
    { value: 'list', label: t('schedules.listView') },
  ]

  return (
    <>
      <div className={styles.page}>
        <PageHeader
          title={t('schedules.title')}
          actions={
            <div className={styles.actions}>
              <SegmentedControl
                options={viewOptions}
                value={view}
                onChange={setView}
                aria-label={t('schedules.viewLabel')}
              />
              {(user.role === 'admin' || user.role === 'seventy') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportCsv}
                  title={t('calendar.exportCsv')}
                >
                  <Download size={14} />
                </Button>
              )}
              {user.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManualSync}
                  loading={syncing}
                  title={t('calendar.syncTitle')}
                >
                  <RefreshCw size={14} />
                </Button>
              )}
              {canManage && (
                <Button variant="secondary" size="sm" onClick={() => setEventFormOpen(true)}>
                  + {t('schedules.addEvent')}
                </Button>
              )}
              {canManage && (
                <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                  + {t('calendar.addSchedule')}
                </Button>
              )}
            </div>
          }
        />

        <ScheduleFilterBar
          kinds={kinds}
          onKindsChange={setKinds}
          regions={regions}
          regionId={regionId}
          onRegionChange={setRegionId}
          status={status}
          onStatusChange={setStatus}
          hideStatus={view !== 'list'}
          rangeSetting={rangeSetting}
          range={range}
          onRangeChange={saveRange}
        />

        {loading ? (
          <LoadingState />
        ) : view === 'list' ? (
          <ScheduleListPanel
            items={items}
            visible={filterByStatus(items, status, today)}
            today={today}
            renderItem={renderItem}
          />
        ) : (
          <ScheduleCalendarPanel
            view={view}
            schedules={calendarSchedules}
            generalSchedules={calendarEvents}
            items={items}
            getUnitName={getUnitName}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            renderItem={renderItem}
          />
        )}

        {formOpen && (
          <ScheduleFormModal
            initialDate={selectedDate ?? undefined}
            generalSchedules={generalSchedules}
            currentUser={user}
            onClose={() => setFormOpen(false)}
            onSaved={() => {
              setFormOpen(false)
              toast.success(t('schedule.savedSuccess'))
            }}
          />
        )}
        {(eventFormOpen || eventEditTarget) && (
          <GeneralScheduleFormModal
            initialData={eventEditTarget ?? undefined}
            initialDate={selectedDate ?? undefined}
            onClose={() => {
              setEventFormOpen(false)
              setEventEditTarget(null)
            }}
            onSaved={() => {
              setEventFormOpen(false)
              setEventEditTarget(null)
              toast.success(t('schedule.savedSuccess'))
            }}
          />
        )}
        {editTarget && (
          <EditScheduleModal
            schedule={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={() => {
              setEditTarget(null)
              toast.success(t('admin.scheduleEditSuccess'))
            }}
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
        <GeneralScheduleDetailSheet
          event={detailTarget}
          attendances={
            detailTarget
              ? schedules.filter(
                  (s) => s.type === 'general_attendance' && s.generalScheduleId === detailTarget.id,
                )
              : []
          }
          currentUid={user.uid}
          currentRole={user.role}
          onClose={() => setDetailTarget(null)}
          onAttend={async () => {
            if (detailTarget) await handleAttend(detailTarget.id)
          }}
          onCancelAttend={async () => {
            const attendance = myAttendances.find((x) => x.generalScheduleId === detailTarget?.id)
            if (attendance) await handleCancelAttend(attendance.id)
          }}
          onEdit={() => {
            const target = detailTarget
            setDetailTarget(null)
            setEventEditTarget(target)
          }}
          onDelete={() => detailTarget && handleDeleteEvent(detailTarget)}
        />
      </div>
    </>
  )
}
