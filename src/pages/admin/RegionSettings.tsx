import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { authUserAtom } from '@/store/authAtom'
import { createTask } from '@/services/taskService'
import { useUsers } from '@/hooks/useUsers'
import { ALL_UNITS, REGIONS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Select, Button, Input, Badge } from '@/components/ui'
import { MultiDatePicker } from '@/components/domain'
import type { AvailableDateSlot } from '@/types'
import styles from './RegionSettings.module.scss'

const TASK_TYPE_OPTIONS = [
  { value: 'select_interview', label: '접견 일정 선택 (시간 단위)' },
  { value: 'select_meeting', label: '모임 일정 선택 (시간 단위)' },
]

const SLOT_DURATION_OPTIONS = [
  { value: '30', label: '30분 단위' },
  { value: '60', label: '1시간 단위' },
  { value: '90', label: '1.5시간 단위' },
  { value: '120', label: '2시간 단위' },
]

const DEFAULT_START = '09:00'
const DEFAULT_END = '18:00'

export function TaskCreation() {
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()
  const presidents = users.filter(u => u.role === 'president')
  const seventies = users.filter(u => u.role === 'seventy')

  const [selectedPresidents, setSelectedPresidents] = useState<Set<string>>(new Set())
  const [seventyUid, setSeventyUid] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [taskType, setTaskType] = useState<'select_interview' | 'select_meeting'>('select_interview')
  const [dueDate, setDueDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  // per-date time config: date → { startTime, endTime }
  const [dateTimes, setDateTimes] = useState<Record<string, { startTime: string; endTime: string }>>({})
  const [slotDuration, setSlotDuration] = useState('60')
  const [loading, setLoading] = useState(false)

  const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }))

  function handleDatesChange(dates: string[]) {
    setSelectedDates(dates)
    setDateTimes(prev => {
      const next: typeof prev = {}
      dates.forEach(d => {
        next[d] = prev[d] ?? { startTime: DEFAULT_START, endTime: DEFAULT_END }
      })
      return next
    })
  }

  function setDateSlotTime(date: string, field: 'startTime' | 'endTime', value: string) {
    setDateTimes(prev => ({ ...prev, [date]: { ...prev[date], [field]: value } }))
  }

  function togglePresident(uid: string) {
    setSelectedPresidents(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  const filteredPresidents = filterRegion
    ? presidents.filter(p => {
        const unit = ALL_UNITS.find(u => u.id === p.unitId)
        return unit?.regionId === filterRegion
      })
    : presidents

  function toggleAll() {
    const pool = filteredPresidents
    const allSelected = pool.every(p => selectedPresidents.has(p.uid))
    setSelectedPresidents(prev => {
      const next = new Set(prev)
      if (allSelected) pool.forEach(p => next.delete(p.uid))
      else pool.forEach(p => next.add(p.uid))
      return next
    })
  }

  function handleRegionFilter(regionId: string) {
    setFilterRegion(regionId)
    if (regionId) {
      const pool = presidents.filter(p => ALL_UNITS.find(u => u.id === p.unitId)?.regionId === regionId)
      setSelectedPresidents(new Set(pool.map(p => p.uid)))
    }
  }

  const availableDateSlots: AvailableDateSlot[] = selectedDates
    .map(d => ({ date: d, ...(dateTimes[d] ?? { startTime: DEFAULT_START, endTime: DEFAULT_END }) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const isValid = selectedPresidents.size > 0 && !!seventyUid && availableDateSlots.length > 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      if (selectedPresidents.size === 0) toast.error('대상 회장을 한 명 이상 선택해주세요.')
      else if (!seventyUid) toast.error('담당 지역 칠십인을 선택해주세요.')
      else toast.error('가능 날짜를 하나 이상 선택해주세요.')
      return
    }

    setLoading(true)
    try {
      await Promise.all(
        Array.from(selectedPresidents).map(assignedTo => {
          const president = presidents.find(p => p.uid === assignedTo)
          const unit = ALL_UNITS.find(u => u.id === president?.unitId)
          return createTask({
            type: taskType,
            assignedTo,
            seventyUid,
            regionId: unit?.regionId ?? '',
            dueDate,
            createdBy: user.uid,
            availableDays: [],
            availableDateSlots,
            slotDurationMinutes: parseInt(slotDuration),
          })
        })
      )
      toast.success(`Task ${selectedPresidents.size}건이 생성되었습니다.`)
      setSelectedPresidents(new Set())
      setSeventyUid('')
      setSelectedDates([])
      setDateTimes({})
    } catch {
      toast.error('Task 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext="일정 요청 관리" />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title="Task 생성 (접견/모임 일정 요청)" />
          <CardBody>
            <form className={styles.form} onSubmit={handleCreate}>
              <Select
                label="담당 지역 칠십인"
                value={seventyUid}
                onChange={e => setSeventyUid(e.target.value)}
                options={seventyOptions}
              />

              <div className={styles.presidentSection}>
                <div className={styles.presidentHeader}>
                  <span className={styles.presidentLabel}>대상 회장</span>
                  {selectedPresidents.size > 0 && (
                    <Badge variant="default">{selectedPresidents.size}명 선택됨</Badge>
                  )}
                  <button type="button" className={styles.selectAllBtn} onClick={toggleAll}>
                    {filteredPresidents.every(p => selectedPresidents.has(p.uid)) ? '해제' : '전체 선택'}
                  </button>
                </div>
                <div className={styles.regionFilter}>
                  <button
                    type="button"
                    className={clsx(styles.regionBtn, !filterRegion && styles.regionBtnActive)}
                    onClick={() => setFilterRegion('')}
                  >전체</button>
                  {REGIONS.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className={clsx(styles.regionBtn, filterRegion === r.id && styles.regionBtnActive)}
                      onClick={() => handleRegionFilter(r.id)}
                    >{r.name}</button>
                  ))}
                </div>
                <div className={styles.presidentList}>
                  {filteredPresidents.length === 0 ? (
                    <p className={styles.noneText}>{filterRegion ? '해당 지역에 등록된 회장이 없습니다.' : '등록된 회장이 없습니다.'}</p>
                  ) : (
                    filteredPresidents.map(p => {
                      const unit = ALL_UNITS.find(u => u.id === p.unitId)
                      return (
                        <label key={p.uid} className={styles.presidentRow}>
                          <input type="checkbox" checked={selectedPresidents.has(p.uid)}
                            onChange={() => togglePresident(p.uid)} className={styles.checkbox} />
                          <span className={styles.presidentName}>{p.name}</span>
                          {unit && <span className={styles.presidentUnit}>{unit.name}</span>}
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <Select
                label="Task 유형"
                value={taskType}
                onChange={e => setTaskType(e.target.value as typeof taskType)}
                options={TASK_TYPE_OPTIONS}
              />

              <div className={styles.availSection}>
                <p className={styles.availLabel}>가능 날짜 선택</p>
                <p className={styles.availHint}>캘린더에서 날짜를 클릭해 선택하세요. 날짜별로 가능 시간을 설정할 수 있습니다.</p>
                <MultiDatePicker selected={selectedDates} onChange={handleDatesChange} />

                {availableDateSlots.length > 0 && (
                  <div className={styles.dateTimeList}>
                    <p className={styles.dateTimeTitle}>날짜별 가능 시간</p>
                    {availableDateSlots.map(s => (
                      <div key={s.date} className={styles.dateTimeRow}>
                        <span className={styles.dateTimeLabel}>
                          {dayjs(s.date).format('M/D (ddd)')}
                        </span>
                        <input
                          type="time"
                          className={styles.timeInput}
                          value={s.startTime}
                          onChange={e => setDateSlotTime(s.date, 'startTime', e.target.value)}
                        />
                        <span className={styles.dateTimeSep}>~</span>
                        <input
                          type="time"
                          className={styles.timeInput}
                          value={s.endTime}
                          onChange={e => setDateSlotTime(s.date, 'endTime', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Select
                  label="시간 단위"
                  value={slotDuration}
                  onChange={e => setSlotDuration(e.target.value)}
                  options={SLOT_DURATION_OPTIONS}
                />
              </div>

              <Input
                label="마감일"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />

              <Button type="submit" loading={loading} disabled={!isValid}>
                Task {selectedPresidents.size > 0 ? `${selectedPresidents.size}건 ` : ''}생성
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
