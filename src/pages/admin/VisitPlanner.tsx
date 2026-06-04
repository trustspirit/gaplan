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
import styles from './VisitPlanner.module.scss'

export function VisitPlanner() {
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
  const [loading, setLoading] = useState(false)

  const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }))

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

  const isValid = !!seventyUid && availableDates.length > 0 && selectedPresidents.size > 0

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      if (!seventyUid) toast.error('담당 지역 칠십인을 선택해주세요.')
      else if (availableDates.length === 0) toast.error('가능 방문 일요일을 하나 이상 선택해주세요.')
      else toast.error('대상 회장을 한 명 이상 선택해주세요.')
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
          })
        })
      )
      toast.success(`와드 방문 Task ${selectedPresidents.size}건이 생성되었습니다.`)
      setSelectedPresidents(new Set())
      setSeventyUid('')
      setAvailableDates([])
      setTaskNote('')
    } catch {
      toast.error('Task 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext="방문 일정 계획" />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title="와드 방문 Task 생성" />
          <CardBody>
            <p className={styles.desc}>
              가능한 방문 일요일을 선택하고 회장들에게 Task를 배정합니다.
              회장들은 Task에서 각 와드/지부에 날짜를 배정해 제출합니다.
            </p>
            <form className={styles.form} onSubmit={handleCreate}>
              <Select
                label="담당 지역 칠십인"
                value={seventyUid}
                onChange={e => setSeventyUid(e.target.value)}
                options={seventyOptions}
              />

              <div className={styles.section}>
                <p className={styles.sectionLabel}>가능 방문 일요일 선택</p>
                <p className={styles.sectionHint}>금식일을 제외한 일요일만 선택할 수 있습니다.</p>
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
                  <span className={styles.presidentLabel}>대상 회장</span>
                  {selectedPresidents.size > 0 && (
                    <Badge variant="default">{selectedPresidents.size}명 선택됨</Badge>
                  )}
                  <button type="button" className={styles.selectAllBtn} onClick={toggleAll}>
                    {filteredPresidents.every(p => selectedPresidents.has(p.uid)) ? '해제' : '전체 선택'}
                  </button>
                </div>
                <div className={styles.regionFilter}>
                  <button type="button"
                    className={clsx(styles.regionBtn, !filterRegion && styles.regionBtnActive)}
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

              <Input label="마감일" type="date" value={dueDate}
                onChange={e => setDueDate(e.target.value)} />

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
