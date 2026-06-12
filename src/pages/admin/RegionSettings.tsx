import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { createTask } from '@/services/taskService'
import { useUsers } from '@/hooks/useUsers'
import { ALL_UNITS, REGIONS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Select, Button, Input, Badge } from '@/components/ui'
import { MultiDatePicker, ProjectPicker } from '@/components/domain'
import { paintedCellsToDateSlots } from '@/components/domain/TimePainterPicker/paintedCellsToDateSlots'
import { TimePainterPicker } from '@/components/domain/TimePainterPicker/TimePainterPicker'
import type { AvailableDateSlot } from '@/types'
import styles from './RegionSettings.module.scss'

type TaskType = 'select_interview' | 'select_visit'

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
  const [projectId, setProjectId] = useState('')
  const [dueDate,       setDueDate]       = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [paintedCells, setPaintedCells] = useState<Set<string>>(new Set())
  const [dailyRange, setDailyRange] = useState<[string, string]>(['09:00', '21:00'])
  const [slotDuration, setSlotDuration]   = useState('60')
  const [loading,      setLoading]        = useState(false)

  const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }))

  function handleTypeChange(type: TaskType) {
    setTaskType(type)
    setSelectedDates([])
    setPaintedCells(new Set())
  }

  function handleDatesChange(dates: string[]) {
    setSelectedDates(dates)
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

  const slotDurationMinutes = parseInt(slotDuration)
  const availableDateSlots: AvailableDateSlot[] = paintedCellsToDateSlots(paintedCells, slotDurationMinutes)

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
              projectId: projectId || undefined,
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
            slotDurationMinutes,
            projectId: projectId || undefined,
          })
        })
      )
      toast.success(t('task.createSuccess', { count: selectedPresidents.size }))
      setSelectedPresidents(new Set())
      setSeventyUid('')
      setSelectedDates([])
      setPaintedCells(new Set())
      setTaskTitle('')
      setTaskNote('')
      setProjectId('')
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

              <ProjectPicker value={projectId} onChange={setProjectId} />

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
                          {unit && <span className={styles.presidentUnit}>{unit.name.ko}</span>}
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

                {taskType === 'select_interview' && (
                  <TimePainterPicker
                    selectedDates={selectedDates}
                    dailyRange={dailyRange}
                    periodMinutes={slotDurationMinutes}
                    paintedCells={paintedCells}
                    onSetCell={(key, on) => {
                      setPaintedCells(prev => {
                        const next = new Set(prev)
                        on ? next.add(key) : next.delete(key)
                        return next
                      })
                    }}
                    onChangeRange={setDailyRange}
                  />
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
