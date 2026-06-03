import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { authUserAtom } from '@/store/authAtom'
import { createTask } from '@/services/taskService'
import { useUsers } from '@/hooks/useUsers'
import { ALL_UNITS } from '@/constants/regions'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Select, Button, Input } from '@/components/ui'
import styles from './RegionSettings.module.scss'

const TASK_TYPE_OPTIONS = [
  { value: 'select_visit', label: '와드 방문 일정 선택' },
  { value: 'select_interview', label: '접견 일정 선택' },
]

export function TaskCreation() {
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()
  const presidents = users.filter(u => u.role === 'president')
  const seventies = users.filter(u => u.role === 'seventy')
  const [assignedTo, setAssignedTo] = useState('')
  const [seventyUid, setSeventyUid] = useState('')
  const [taskType, setTaskType] = useState<'select_visit' | 'select_interview'>('select_visit')
  const [dueDate, setDueDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'))
  const [loading, setLoading] = useState(false)

  const presidentOptions = presidents.map(p => ({
    value: p.uid,
    label: `${p.name} (${p.unitId ?? '-'})`,
  }))

  const seventyOptions = seventies.map(s => ({
    value: s.uid,
    label: s.name,
  }))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignedTo) { toast.error('대상 회장을 선택해주세요.'); return }
    if (!seventyUid) { toast.error('담당 지역 칠십인을 선택해주세요.'); return }
    setLoading(true)
    try {
      const president = presidents.find(p => p.uid === assignedTo)
      const unit = ALL_UNITS.find(u => u.id === president?.unitId)
      const regionId = unit?.regionId ?? ''
      await createTask({ type: taskType, assignedTo, seventyUid, regionId, dueDate, createdBy: user.uid })
      toast.success('Task가 생성되었습니다.')
      setAssignedTo('')
      setSeventyUid('')
    } catch {
      toast.error('Task 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext="일정 요청 관리" />}
    >
      <div className={styles.page}>
        <Card>
          <CardHeader title="Task 생성 (일정 요청)" />
          <CardBody>
            <form className={styles.form} onSubmit={handleCreate}>
              <Select label="담당 지역 칠십인" value={seventyUid} onChange={e => setSeventyUid(e.target.value)} options={seventyOptions} />
              <Select label="대상 회장" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} options={presidentOptions} />
              <Select label="Task 유형" value={taskType} onChange={e => setTaskType(e.target.value as typeof taskType)} options={TASK_TYPE_OPTIONS} />
              <Input label="마감일" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <Button type="submit" loading={loading}>Task 생성</Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
