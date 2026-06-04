import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import clsx from 'clsx'
import { authUserAtom } from '@/store/authAtom'
import { createTask } from '@/services/taskService'
import { useUsers } from '@/hooks/useUsers'
import { ALL_UNITS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Select, Button, Input, Badge } from '@/components/ui'
import styles from './RegionSettings.module.scss'

const TASK_TYPE_OPTIONS = [
  { value: 'select_visit', label: '와드 방문 일정 선택 (일 단위)' },
  { value: 'select_interview', label: '접견 일정 선택 (시간 단위)' },
]

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export function TaskCreation() {
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()
  const presidents = users.filter(u => u.role === 'president')
  const seventies = users.filter(u => u.role === 'seventy')

  const [selectedPresidents, setSelectedPresidents] = useState<Set<string>>(new Set())
  const [seventyUid, setSeventyUid] = useState('')
  const [taskType, setTaskType] = useState<'select_visit' | 'select_interview'>('select_visit')
  const [dueDate, setDueDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const [availableDays, setAvailableDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [loading, setLoading] = useState(false)

  const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }))
  const isInterview = taskType === 'select_interview'

  function toggleDay(day: number) {
    setAvailableDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function togglePresident(uid: string) {
    setSelectedPresidents(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  function toggleAll() {
    if (selectedPresidents.size === presidents.length) {
      setSelectedPresidents(new Set())
    } else {
      setSelectedPresidents(new Set(presidents.map(p => p.uid)))
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPresidents.size === 0) { toast.error('대상 회장을 한 명 이상 선택해주세요.'); return }
    if (!seventyUid) { toast.error('담당 지역 칠십인을 선택해주세요.'); return }
    if (availableDays.length === 0) { toast.error('가능 요일을 하나 이상 선택해주세요.'); return }

    setLoading(true)
    try {
      await Promise.all(
        Array.from(selectedPresidents).map(assignedTo => {
          const president = presidents.find(p => p.uid === assignedTo)
          const unit = ALL_UNITS.find(u => u.id === president?.unitId)
          const regionId = unit?.regionId ?? ''
          return createTask({
            type: taskType,
            assignedTo,
            seventyUid,
            regionId,
            dueDate,
            createdBy: user.uid,
            availableDays,
            ...(isInterview ? { availableStartTime: startTime, availableEndTime: endTime } : {}),
          })
        })
      )
      toast.success(`Task ${selectedPresidents.size}건이 생성되었습니다.`)
      setSelectedPresidents(new Set())
      setSeventyUid('')
      setAvailableDays([])
    } catch {
      toast.error('Task 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const allSelected = presidents.length > 0 && selectedPresidents.size === presidents.length

  return (
    <AppShell role={user.role} name={user.name} topBar={<TopBar name={user.name} subtext="일정 요청 관리" />}>
      <div className={styles.page}>
        <Card>
          <CardHeader title="Task 생성 (일정 요청)" />
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
                    {allSelected ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <div className={styles.presidentList}>
                  {presidents.length === 0 ? (
                    <p className={styles.noneText}>등록된 회장이 없습니다.</p>
                  ) : (
                    presidents.map(p => {
                      const unit = ALL_UNITS.find(u => u.id === p.unitId)
                      return (
                        <label key={p.uid} className={styles.presidentRow}>
                          <input
                            type="checkbox"
                            checked={selectedPresidents.has(p.uid)}
                            onChange={() => togglePresident(p.uid)}
                            className={styles.checkbox}
                          />
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
                <p className={styles.availLabel}>
                  가능 요일
                  <span className={styles.availHint}>
                    {isInterview ? '— 접견 가능한 요일을 선택하세요' : '— 방문 가능한 요일을 선택하세요'}
                  </span>
                </p>
                <div className={styles.days}>
                  {DAYS.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      className={clsx(styles.dayBtn, availableDays.includes(i) && styles.daySelected)}
                      onClick={() => toggleDay(i)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {isInterview && (
                  <div className={styles.timeRow}>
                    <Input
                      label="가능 시작 시간"
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                    />
                    <Input
                      label="가능 종료 시간"
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Input
                label="마감일"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />

              <Button
                type="submit"
                loading={loading}
                disabled={selectedPresidents.size === 0 || !seventyUid || availableDays.length === 0}
              >
                Task {selectedPresidents.size > 0 ? `${selectedPresidents.size}건 ` : ''}생성
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
