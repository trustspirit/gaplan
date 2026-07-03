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
import { Card, CardHeader, CardBody, Select, Button, Input, Badge, Textarea } from '@/components/ui'
import { MultiDatePicker } from '@/components/domain/MultiDatePicker/MultiDatePicker'
import { ProjectPicker } from '@/components/domain/ProjectPicker/ProjectPicker'
import styles from './VisitPlanner.module.scss'

export function VisitPlanner() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()
  const presidents = users.filter(u => u.role === 'president')
  const seventies = users.filter(u => u.role === 'seventy')

  const [seventyUid, setSeventyUid] = useState('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [filterRegion, setFilterRegion] = useState('')
  const [selectedPresidents, setSelectedPresidents] = useState<Set<string>>(new Set())
  const [taskNote, setTaskNote] = useState('')
  const [dueDate, setDueDate] = useState(dayjs().add(14, 'day').format('YYYY-MM-DD'))
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)

  const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }))

  const filteredPresidents = filterRegion
    ? presidents.filter(p => ALL_UNITS.find(u => u.id === p.unitId)?.regionId === filterRegion)
    : presidents

  function togglePresident(uid: string) {
    setSelectedPresidents(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
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

  const isValid = !!seventyUid && availableDates.length > 0 && selectedPresidents.size > 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      if (!seventyUid) toast.error(t('common.selectSeventy'))
      else if (availableDates.length === 0) toast.error(t('common.selectSunday'))
      else toast.error(t('common.selectPresident'))
      return
    }

    setLoading(true)
    try {
      await Promise.all(
        Array.from(selectedPresidents).map(assignedTo => {
          const president = presidents.find(p => p.uid === assignedTo)
          const unit = ALL_UNITS.find(u => u.id === president?.unitId)
          return createTask({
            type: 'select_visit',
            assignedTo,
            seventyUid,
            regionId: unit?.regionId ?? '',
            dueDate,
            createdBy: user.uid,
            availableDays: [0],
            availableDates,
            note: taskNote.trim() || undefined,
            projectId: projectId || undefined,
          })
        })
      )
      toast.success(t('task.createSuccess', { count: selectedPresidents.size }))
      setSelectedPresidents(new Set())
      setSeventyUid('')
      setAvailableDates([])
      setTaskNote('')
      setProjectId('')
    } catch {
      toast.error(t('task.createFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext={t('admin.visitPlanner')} />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title={t('admin.visitTaskCreateTitle')} />
          <CardBody>
            <p className={styles.desc}>{t('task.visitTaskDesc')}</p>
            <form className={styles.form} onSubmit={handleCreate}>
              <Select
                label={t('role.seventy')}
                value={seventyUid}
                onChange={e => setSeventyUid(e.target.value)}
                options={seventyOptions}
              />

              <div className={styles.section}>
                <p className={styles.sectionLabel}>{t('ward.noSundaysAvailable', { defaultValue: '가능 방문 일요일 선택' })}</p>
                <p className={styles.sectionHint}>{t('ward.sundayOnlyHint', { defaultValue: '금식일을 제외한 일요일만 선택할 수 있습니다.' })}</p>
                <MultiDatePicker
                  selected={availableDates}
                  onChange={setAvailableDates}
                  sundayOnly
                />
                {availableDates.length > 0 && (
                  <div className={styles.selectedSundays}>
                    {availableDates.map(d => (
                      <span key={d} className={styles.sundayChip}>
                        {dayjs(d).format('M/D (ddd)')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.presidentSection}>
                <div className={styles.presidentHeader}>
                  <span className={styles.presidentLabel}>{t('task.targetPresidents', { defaultValue: '대상 회장' })}</span>
                  {selectedPresidents.size > 0 && (
                    <Badge variant="default">{t('task.selectedCount', { count: selectedPresidents.size, defaultValue: `${selectedPresidents.size}명 선택됨` })}</Badge>
                  )}
                  <button type="button" className={styles.selectAllBtn} onClick={toggleAll}>
                    {filteredPresidents.every(p => selectedPresidents.has(p.uid))
                      ? t('common.deselectAll', { defaultValue: '해제' })
                      : t('common.selectAll', { defaultValue: '전체 선택' })}
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
                      {filterRegion
                        ? t('task.noPresidentsInRegion', { defaultValue: '해당 지역에 등록된 회장이 없습니다.' })
                        : t('task.noPresidents', { defaultValue: '등록된 회장이 없습니다.' })}
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

              <Input label={t('task.dueDate')} type="date" value={dueDate}
                onChange={e => setDueDate(e.target.value)} />

              <Textarea
                label={t('task.noteLabel', { defaultValue: '요청 사항 / 메모 (선택)' })}
                className={styles.textarea}
                wrapperClassName={styles.textareaField}
                value={taskNote}
                onChange={e => setTaskNote(e.target.value)}
                placeholder={t('task.notePlaceholder', { defaultValue: '회장이 Task를 받을 때 함께 볼 내용을 입력하세요.' })}
                rows={3}
              />

              <ProjectPicker value={projectId} onChange={setProjectId} />

              <Button type="submit" loading={loading} disabled={!isValid}>
                {selectedPresidents.size > 0
                  ? t('task.createCount', { count: selectedPresidents.size, defaultValue: `Task ${selectedPresidents.size}건 생성` })
                  : t('task.create')}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
