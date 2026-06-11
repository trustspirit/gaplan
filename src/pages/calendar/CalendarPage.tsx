import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { X, RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { useScheduleDateRange } from '@/hooks/useScheduleDateRange'
import { useGeneralSchedules } from '@/hooks/useGeneralSchedules'
import { manualCalendarSync } from '@/services/scheduleService'
import { registerAttendance, cancelAttendance } from '@/services/generalScheduleService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import type { Schedule, GeneralSchedule } from '@/types'
import { CalendarView, ScheduleItem, ScheduleFormModal, EditScheduleModal, ScheduleDateRangeFilter, GeneralEventItem, GeneralScheduleDetailSheet } from '@/components/domain'
import styles from './CalendarPage.module.scss'

export function CalendarPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Schedule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null)
  const [detailTarget, setDetailTarget] = useState<GeneralSchedule | null>(null)
  const { generalSchedules } = useGeneralSchedules()

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
  const { getUnitName } = useUnits()
  const filters = user.role === 'president'
    ? { presidentUid: user.uid }
    : user.role === 'seventy'
      ? { seventyUid: user.uid }
      : user.role === 'exec_secretary'
        ? { seventyUid: user.assignedSeventyUid ?? '' }
        : {}
  const { schedules } = useSchedules(filters)
  const { setting: rangeSetting, range, save: saveRange } = useScheduleDateRange(user.uid)

  // Toggle: clicking the same date again deselects it
  const handleDateClick = (date: string) => {
    setSelectedDate(prev => prev === date ? null : date)
  }

  const daySchedules = selectedDate
    ? schedules.filter(s => s.status === 'confirmed' && s.date === selectedDate)
    : schedules
        .filter(s => s.status === 'confirmed' && s.date >= range.start && s.date <= range.end)
        .sort((a, b) => a.date.localeCompare(b.date))

  const myAttendances = schedules.filter(
    s => s.type === 'general_attendance' && s.seventyUid === user.uid,
  )

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

  const exportCsv = () => {
    const DOW = ['일', '월', '화', '수', '목', '금', '토']
    const TYPE_LABEL: Record<string, string> = {
      ward_visit: '와드방문', interview: '접견', meeting: '모임', general_attendance: '행사참석',
    }
    const CAT_LABEL: Record<string, string> = {
      conference: '대회/행사', fasting: '금식', other: '기타',
    }

    const scheduleRows = schedules
      .filter(s => s.date >= range.start && s.date <= range.end && s.status === 'confirmed')
      .map(s => {
        const d = dayjs(s.date)
        const title = s.customTitle ?? (s.wardName ? `${getUnitName(s.unitId)} ${s.wardName}` : getUnitName(s.unitId))
        return [s.date, DOW[d.day()], TYPE_LABEL[s.type] ?? s.type, title, s.startTime, s.endTime, '확정']
      })

    const generalRows = generalSchedules
      .filter(gs => gs.date >= range.start && gs.date <= range.end)
      .map(gs => {
        const d = dayjs(gs.date)
        return [gs.date, DOW[d.day()], CAT_LABEL[gs.category] ?? gs.category, gs.title, gs.startTime ?? '', gs.endTime ?? '', '확정']
      })

    const header = ['날짜', '요일', '유형', '제목', '시작시간', '종료시간', '상태']
    const sorted = [...scheduleRows, ...generalRows].sort((a, b) => (a[0] as string).localeCompare(b[0] as string))
    const csv = [header, ...sorted]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `일정_${range.start}_${range.end}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const listTitle = selectedDate
    ? t('calendar.selectedDateTitle', { date: dayjs(selectedDate).format('M/D (ddd)') })
    : t('calendar.upcomingTitle')

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext={t('calendar.subtext')} helpInfoKey="pageHelp.calendar" />}
    >
      <div className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.calendarCol}>
            <Card>
              <CardHeader
                title={t('calendar.title')}
                action={
                  // Admin can manually re-sync schedules to Google Calendar
                  user.role === 'admin' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleManualSync}
                      loading={syncing}
                      title={t('calendar.syncTitle')}
                    >
                      <RefreshCw size={14} />
                    </Button>
                  ) : undefined
                }
              />
              <CardBody>
                <CalendarView
                  schedules={schedules}
                  generalSchedules={generalSchedules}
                  onDateClick={handleDateClick}
                  selectedDate={selectedDate}
                  getUnitName={getUnitName}
                />
              </CardBody>
            </Card>
          </div>
          <div className={styles.listCol}>
            {!selectedDate && (
              <ScheduleDateRangeFilter setting={rangeSetting} currentRange={range} onChange={saveRange} />
            )}
            <Card>
              <CardHeader
                title={listTitle}
                action={
                  (user.role === 'admin' || user.role === 'seventy' || selectedDate) ? (
                    <div className={styles.headerActions}>
                      {user.role === 'admin' && (
                        <Button variant="primary" size="sm" onClick={() => setFormOpen(true)}>
                          + 일정 추가
                        </Button>
                      )}
                      {(user.role === 'admin' || user.role === 'seventy') && (
                        <Button variant="ghost" size="sm" onClick={exportCsv} title="CSV 내보내기">
                          <Download size={14} />
                        </Button>
                      )}
                      {selectedDate && (
                        <button
                          type="button"
                          className={styles.clearBtn}
                          onClick={() => setSelectedDate(null)}
                          title={t('calendar.clearSelection')}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ) : undefined
                }
              />
              <CardBody>
                {(() => {
                  const generalInRange = generalSchedules.filter(gs =>
                    selectedDate ? gs.date === selectedDate : (gs.date >= range.start && gs.date <= range.end)
                  )

                  type ListItem =
                    | { date: string; time: string; kind: 'schedule'; data: Schedule }
                    | { date: string; time: string; kind: 'general'; data: GeneralSchedule }

                  const items: ListItem[] = [
                    ...daySchedules.map(s => ({ date: s.date, time: s.startTime, kind: 'schedule' as const, data: s })),
                    ...generalInRange.map(gs => ({ date: gs.date, time: gs.startTime ?? '00:00', kind: 'general' as const, data: gs })),
                  ].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

                  if (items.length === 0) return <p className={styles.empty}>{t('calendar.noSchedule')}</p>

                  return items.map(item => {
                    if (item.kind === 'general') {
                      const gs = item.data
                      const attendance = myAttendances.find(a => a.generalScheduleId === gs.id)
                      return (
                        <GeneralEventItem
                          key={`gs-${gs.id}`}
                          event={gs}
                          isAttending={!!attendance}
                          canAttend={user.role === 'admin' || user.role === 'seventy'}
                          onAttend={() => handleAttend(gs.id)}
                          onCancelAttend={() => attendance && handleCancelAttend(attendance.id)}
                          onClick={() => setDetailTarget(gs)}
                        />
                      )
                    }
                    const s = item.data
                    return (
                      <ScheduleItem
                        key={s.id}
                        schedule={s}
                        unitName={getUnitName(s.unitId)}
                        showCalendarAdd={user.role === 'president'}
                        canEdit={user.role === 'admin' || user.role === 'seventy'}
                        onEdit={() => setEditTarget(s)}
                        onDelete={() => setDeleteTarget(s)}
                      />
                    )
                  })
                })()}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
      {formOpen && (
        <ScheduleFormModal
          initialDate={selectedDate ?? undefined}
          generalSchedules={generalSchedules}
          currentUser={user}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); toast.success(t('schedule.savedSuccess')) }}
        />
      )}
      {editTarget && (
        <EditScheduleModal
          schedule={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); toast.success(t('admin.scheduleEditSuccess')) }}
        />
      )}
      {deleteTarget && (
        <EditScheduleModal
          schedule={deleteTarget}
          initialConfirmDelete
          onClose={() => setDeleteTarget(null)}
          onSaved={() => { setDeleteTarget(null); toast.success(t('admin.scheduleCancelSuccess')) }}
        />
      )}
      <GeneralScheduleDetailSheet
        event={detailTarget}
        attendances={
          detailTarget
            ? schedules.filter(s => s.type === 'general_attendance' && s.generalScheduleId === detailTarget.id)
            : []
        }
        currentUid={user.uid}
        currentRole={user.role}
        onClose={() => setDetailTarget(null)}
        onAttend={async () => { if (detailTarget) await handleAttend(detailTarget.id) }}
        onCancelAttend={async () => {
          const a = myAttendances.find(x => x.generalScheduleId === detailTarget?.id)
          if (a) await handleCancelAttend(a.id)
        }}
        onEdit={() => { setDetailTarget(null) }}
        onDelete={async () => {
          setDetailTarget(null)
          toast.info('행사 일정 페이지에서 삭제할 수 있습니다.')
        }}
      />
    </AppShell>
  )
}
