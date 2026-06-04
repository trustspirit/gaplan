import { useState } from 'react'
import { useAtomValue } from 'jotai'
import dayjs from 'dayjs'
import { X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { useSchedules } from '@/hooks/useSchedules'
import { useUnits } from '@/hooks/useUnits'
import { manualCalendarSync } from '@/services/scheduleService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Button } from '@/components/ui'
import { CalendarView, ScheduleItem } from '@/components/domain'
import styles from './CalendarPage.module.scss'

export function CalendarPage() {
  const user = useAtomValue(authUserAtom)!
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const result = await manualCalendarSync()
      toast.success(result.message)
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message ?? '동기화 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }
  const { getUnitName } = useUnits()
  const filters = user.role === 'president'
    ? { presidentUid: user.uid }
    : user.role === 'seventy'
      ? { seventyUid: user.uid }
      : {}
  const { schedules } = useSchedules(filters)

  // Toggle: clicking the same date again deselects it
  const handleDateClick = (date: string) => {
    setSelectedDate(prev => prev === date ? null : date)
  }

  const daySchedules = selectedDate
    ? schedules.filter(s => s.status === 'confirmed' && s.date === selectedDate)
    : schedules
        .filter(s => s.status === 'confirmed' && s.date >= dayjs().format('YYYY-MM-DD'))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10)

  const listTitle = selectedDate
    ? dayjs(selectedDate).format('M월 D일 (ddd) 일정')
    : '예정 일정 (상위 10건)'

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext="캘린더" />}
    >
      <div className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.calendarCol}>
            <Card>
              <CardHeader
                title="일정 캘린더"
                action={
                  // Admin/Seventy can manually re-sync schedules to Google Calendar
                  (user.role === 'admin' || user.role === 'seventy') ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleManualSync}
                      loading={syncing}
                      title="Google Calendar 수동 동기화"
                    >
                      <RefreshCw size={14} />
                    </Button>
                  ) : undefined
                }
              />
              <CardBody>
                <CalendarView
                  schedules={schedules}
                  onDateClick={handleDateClick}
                  selectedDate={selectedDate}
                  getUnitName={getUnitName}
                />
              </CardBody>
            </Card>
          </div>
          <div className={styles.listCol}>
            <Card>
              <CardHeader
                title={listTitle}
                action={selectedDate ? (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setSelectedDate(null)}
                    title="선택 해제"
                  >
                    <X size={14} />
                  </button>
                ) : undefined}
              />
              <CardBody>
                {daySchedules.length === 0
                  ? <p className={styles.empty}>일정이 없습니다.</p>
                  : daySchedules.map(s => (
                      <ScheduleItem
                        key={s.id}
                        schedule={s}
                        unitName={getUnitName(s.unitId)}
                        showCalendarAdd={user.role === 'president'}
                      />
                    ))
                }
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
