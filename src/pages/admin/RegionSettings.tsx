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

type TaskType = 'select_interview' | 'select_visit'

const DEFAULT_TIME_RANGE: TimeRange = { startTime: '09:00', endTime: '10:00' }

export function TaskCreation() {
  const user = useAtomValue(authUserAtom)!
  const { t } = useTranslation()
  const { users } = useUsers()
  const presidents = users.filter(u => u.role === 'president')
  const seventies  = users.filter(u => u.role === 'seventy')

  const [taskType, setTaskType] = useState<TaskType>('select_interview')
  const [selectedPresidents, setSelectedPresidents] = useState<Set<string>>(new Set())
  const [seventyUid,    setSeventyUid]    = useState('')
  const [filterRegion,  setFilterRegion]  = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNote,  setTaskNote]  = useState('')
  const [dueDate,       setDueDate]       = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [dateRanges, setDateRanges] = useState<Record<string, TimeRange[]>>({})
  const [slotDuration, setSlotDuration]   = useState('60')
  const [loading,      setLoading]        = useState(false)

  const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }))

  function handleTypeChange(type: TaskType) {
    setTaskType(type)
    setSelectedDates([])
    setDateRanges({})
  }

  function handleDatesChange(dates: string[]) {
    setSelectedDates(dates)
    if (taskType === 'select_interview') {
      setDateRanges(prev => {
        const next: typeof prev = {}
        dates.forEach(d => { next[d] = prev[d] ?? [{ ...DEFAULT_TIME_RANGE }] })
        return next
      })
    }
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

  const isValid = selectedPresidents.size > 0 && !!seventyUid && selectedDates.length > 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      if (selectedPresidents.size === 0) toast.error(t('common.selectPresident'))
      else if (!seventyUid) toast.error(t('common.selectSeventy'))
      else toast.error(t('common.selectSunday'))
      return
    }

    const batchId = `batch_${Date.now()}`
    setLoading(true)
    try {
      await Promise.all(
        Array.from(selectedPresidents).map(assignedTo => {
          const president = presidents.find(p => p.uid === assignedTo)
          const unit = ALL_UNITS.find(u => u.id === president?.unitId)

          if (taskType === 'select_visit') {
            return createTask({
              type: 'select_visit',
              assignedTo,
              seventyUid,
              regionId: unit?.regionId ?? '',
              dueDate,
              createdBy: user.uid,
              availableDays: [0],
              availableDates: selectedDates,
              note: taskNote.trim() || undefined,
            })
          }

          return createTask({
            type: 'select_interview',
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

  const pageTitle = taskType === 'select_visit'
    ? t('admin.visitTaskCreateTitle')
    : t('admin.taskCreateTitle')

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={t('admin.taskCreate')} />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title={t('admin.taskCreate')} />
          <CardBody>
            <div className={styles.typeToggle}>
              <button
                type="button"
                className={clsx(styles.typeBtn, taskType === 'select_interview' && styles.typeBtnActive)}
                onClick={() => handleTypeChange('select_interview')}
              >
                {t('task.type.select_interview')}
              </button>
              <button
                type="button"
                className={clsx(styles.typeBtn, taskType === 'select_visit' && styles.typeBtnActive)}
                onClick={() => handleTypeChange('select_visit')}
              >
                {t('task.type.select_visit')}
              </button>
            </div>

            <form className={styles.form} onSubmit={handleCreate}>
              <p className={styles.availHint}>{pageTitle}</p>

              {taskType === 'select_interview' && (
                <Input
                  label={t('task.title')}
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder={t('task.titlePlaceholder')}
                />
              )}

              <div className={styles.textareaField}>
                <label className={styles.textareaLabel}>{t('task.noteLabel')}</label>
                <textarea
                  className={styles.textarea}
                  value={taskNote}
                  onChange={e => setTaskNote(e.target.value)}
                  placeholder={t('task.notePlaceholder')}
                  rows={3}
                />
              </div>

              <Select
                label={t('role.seventy')}
                value={seventyUid}
                onChange={e => setSeventyUid(e.target.value)}
                options={seventyOptions}
              />

              <div className={styles.presidentSection}>
                <div className={styles.presidentHeader}>
                  <span className={styles.presidentLabel}>{t('task.targetPresidents')}</span>
                  {selectedPresidents.size > 0 && (
                    <Badge variant="default">{t('task.selectedCount', { count: selectedPresidents.size })}</Badge>
                  )}
                  <button type="button" className={styles.selectAllBtn} onClick={toggleAll}>
                    {filteredPresidents.every(p => selectedPresidents.has(p.uid))
                      ? t('common.deselectAll')
                      : t('common.selectAll')}
                  </button>
                </div>
                <div className={styles.regionFilter}>
                  <button type="button"
                    className={clsx(styles.regionBtn, !filterRegion && styles.regionBtnActive)}
                    onClick={() => setFilterRegion('')}>{t('common.all')}</button>
                  {REGIONS.map(r => (
                    <button key={r.id} type="button"
                      className={clsx(styles.regionBtn, filterRegion === r.id && styles.regionBtnActive)}
                      onClick={() => handleRegionFilter(r.id)}>{r.name}</button>
                  ))}
                </div>
                <div className={styles.presidentList}>
                  {filteredPresidents.length === 0 ? (
                    <p className={styles.noneText}>
                      {filterRegion ? t('task.noPresidentsInRegion') : t('task.noPresidents')}
                    </p>
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
                <p className={styles.availLabel}>
                  {taskType === 'select_visit' ? t('task.selectSundays') : t('task.selectDates')}
                </p>
                {taskType === 'select_visit' && (
                  <p className={styles.availHint}>{t('task.visitTaskDesc')}</p>
                )}
                <MultiDatePicker
                  selected={selectedDates}
                  onChange={handleDatesChange}
                  sundayOnly={taskType === 'select_visit'}
                />

                {taskType === 'select_interview' && availableDateSlots.length > 0 && (
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
                            {t('task.addTimeRange')}
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

                {taskType === 'select_visit' && selectedDates.length > 0 && (
                  <div className={styles.selectedSundays}>
                    {selectedDates.map(d => (
                      <span key={d} className={styles.sundayChip}>
                        {dayjs(d).format('M/D (ddd)')}
                      </span>
                    ))}
                  </div>
                )}

                {taskType === 'select_interview' && (
                  <Input
                    label={t('slotDuration.label')}
                    type="number"
                    min="5"
                    max="480"
                    step="5"
                    value={slotDuration}
                    onChange={e => setSlotDuration(e.target.value)}
                  />
                )}
              </div>

              <Input
                label={t('task.dueDate')}
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />

              <Button type="submit" loading={loading} disabled={!isValid}>
                {selectedPresidents.size > 0
                  ? t('task.createCount', { count: selectedPresidents.size })
                  : t('task.create')}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
