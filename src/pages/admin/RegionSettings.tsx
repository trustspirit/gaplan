import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { createTask } from '@/services/taskService'
import { useUsers } from '@/hooks/useUsers'
import { ALL_UNITS, REGIONS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Select, Button, Input, Badge } from '@/components/ui'
import { MultiDatePicker } from '@/components/domain'
import type { AvailableDateSlot, TimeRange } from '@/types'
import styles from './RegionSettings.module.scss'


const DEFAULT_TIME_RANGE: TimeRange = { startTime: '09:00', endTime: '10:00' }

export function TaskCreation() {
  const user = useAtomValue(authUserAtom)!
  const { t } = useTranslation()
  const { users } = useUsers()
  const presidents = users.filter(u => u.role === 'president')
  const seventies  = users.filter(u => u.role === 'seventy')

  const [selectedPresidents, setSelectedPresidents] = useState<Set<string>>(new Set())
  const [seventyUid,    setSeventyUid]    = useState('')
  const [filterRegion,  setFilterRegion]  = useState('')
  const taskType = 'select_interview' as const
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNote,  setTaskNote]  = useState('')
  const [dueDate,       setDueDate]       = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  // per-date time ranges: date → TimeRange[]
  const [dateRanges, setDateRanges] = useState<Record<string, TimeRange[]>>({})
  const [slotDuration, setSlotDuration]   = useState('60')
  const [loading,      setLoading]        = useState(false)

  const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }))

  function handleDatesChange(dates: string[]) {
    setSelectedDates(dates)
    setDateRanges(prev => {
      const next: typeof prev = {}
      dates.forEach(d => {
        next[d] = prev[d] ?? [{ ...DEFAULT_TIME_RANGE }]
      })
      return next
    })
  }

  function addRange(date: string) {
    setDateRanges(prev => ({
      ...prev,
      [date]: [...(prev[date] ?? []), { ...DEFAULT_TIME_RANGE }],
    }))
  }

  function removeRange(date: string, idx: number) {
    setDateRanges(prev => ({
      ...prev,
      [date]: prev[date].filter((_, i) => i !== idx),
    }))
  }

  function setRangeField(date: string, idx: number, field: keyof TimeRange, value: string) {
    setDateRanges(prev => ({
      ...prev,
      [date]: prev[date].map((r, i) => i === idx ? { ...r, [field]: value } : r),
    }))
  }

  const filteredPresidents = filterRegion
    ? presidents.filter(p => ALL_UNITS.find(u => u.id === p.unitId)?.regionId === filterRegion)
    : presidents

  function togglePresident(uid: string) {
    setSelectedPresidents(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

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
    .map(date => ({ date, timeRanges: dateRanges[date] ?? [{ ...DEFAULT_TIME_RANGE }] }))
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

    const batchId = `batch_${Date.now()}`
    setLoading(true)
    try {
      await Promise.all(
        Array.from(selectedPresidents).map(assignedTo => {
          const president = presidents.find(p => p.uid === assignedTo)
          const unit = ALL_UNITS.find(u => u.id === president?.unitId)
          return createTask({
            type: taskType,
            batchId,
            title: taskTitle.trim() || undefined,
            note: taskNote.trim() || undefined,
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
      toast.success(t('task.createSuccess', { count: selectedPresidents.size }))
      setSelectedPresidents(new Set())
      setSeventyUid('')
      setSelectedDates([])
      setDateRanges({})
      setTaskTitle('')
      setTaskNote('')
    } catch {
      toast.error(t('task.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext="일정 요청 관리" />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title="Task 생성 (접견/안식일 모임)" />
          <CardBody>
            <form className={styles.form} onSubmit={handleCreate}>
              <Input
                label="Task 제목 (선택)"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="예: 2분기 접견 일정"
              />

              <div className={styles.textareaField}>
                <label className={styles.textareaLabel}>요청 사항 / 메모 (선택)</label>
                <textarea
                  className={styles.textarea}
                  value={taskNote}
                  onChange={e => setTaskNote(e.target.value)}
                  placeholder="회장이 Task를 받을 때 함께 볼 내용을 입력하세요."
                  rows={3}
                />
              </div>

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
                  <button type="button" className={clsx(styles.regionBtn, !filterRegion && styles.regionBtnActive)}
                    onClick={() => setFilterRegion('')}>전체</button>
                  {REGIONS.map(r => (
                    <button key={r.id} type="button"
                      className={clsx(styles.regionBtn, filterRegion === r.id && styles.regionBtnActive)}
                      onClick={() => handleRegionFilter(r.id)}>{r.name}</button>
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

              <div className={styles.availSection}>
                <p className={styles.availLabel}>가능 날짜 및 시간대 설정</p>
                <p className={styles.availHint}>날짜를 선택하고 각 날짜마다 가능한 시간대를 추가하세요.</p>
                <MultiDatePicker selected={selectedDates} onChange={handleDatesChange} />

                {availableDateSlots.length > 0 && (
                  <div className={styles.dateSlotList}>
                    {availableDateSlots.map(s => (
                      <div key={s.date} className={styles.dateSlotCard}>
                        <div className={styles.dateSlotHeader}>
                          <span className={styles.dateSlotLabel}>
                            {dayjs(s.date).format('M/D (ddd)')}
                          </span>
                          <button
                            type="button"
                            className={styles.addRangeBtn}
                            onClick={() => addRange(s.date)}
                          >
                            <Plus size={12} />
                            시간대 추가
                          </button>
                        </div>
                        {s.timeRanges.map((range, idx) => (
                          <div key={idx} className={styles.timeRangeRow}>
                            <input
                              type="time"
                              className={styles.timeInput}
                              value={range.startTime}
                              onChange={e => setRangeField(s.date, idx, 'startTime', e.target.value)}
                            />
                            <span className={styles.timeSep}>~</span>
                            <input
                              type="time"
                              className={styles.timeInput}
                              value={range.endTime}
                              onChange={e => setRangeField(s.date, idx, 'endTime', e.target.value)}
                            />
                            {s.timeRanges.length > 1 && (
                              <button
                                type="button"
                                className={styles.removeRangeBtn}
                                onClick={() => removeRange(s.date, idx)}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                <Input
                  label={`${t('slotDuration.label', { defaultValue: '슬롯 길이 (분)' })}`}
                  type="number"
                  min="5"
                  max="480"
                  step="5"
                  value={slotDuration}
                  onChange={e => setSlotDuration(e.target.value)}
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
