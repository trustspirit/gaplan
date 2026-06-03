import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { useAvailability } from '@/hooks/useAvailability'
import { useUsers } from '@/hooks/useUsers'
import { saveAvailabilitySlots } from '@/services/availabilityService'
import { AppShell, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody, Select, Skeleton } from '@/components/ui'
import { AvailabilityEditor } from '@/components/domain'
import type { AvailabilitySlot } from '@/types'
import styles from './AvailabilitySettings.module.scss'

export function AvailabilitySettings() {
  const user = useAtomValue(authUserAtom)!
  const { users } = useUsers()
  const seventies = users.filter(u => u.role === 'seventy')
  const [targetUid, setTargetUid] = useState('')
  const { slots, loading, error } = useAvailability(targetUid)
  const [saving, setSaving] = useState(false)

  const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }))

  const handleSave = async (newSlots: Omit<AvailabilitySlot, 'id' | 'seventyUid'>[]) => {
    if (!targetUid) return
    setSaving(true)
    try {
      await saveAvailabilitySlots(targetUid, newSlots)
      toast.success('가능 일정이 저장되었습니다.')
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      role={user.role} name={user.name}
      topBar={<TopBar name={user.name} subtext="가능 일정 설정" />}
    >
      <div className={styles.page}>
        <Card>
          <CardHeader title="가능 일정 설정" />
          <CardBody>
            <Select
              label="지역 칠십인 선택"
              value={targetUid}
              onChange={e => setTargetUid(e.target.value)}
              options={seventyOptions}
            />
            {targetUid && loading && <Skeleton height="160px" className={styles.skeleton} />}
            {targetUid && error && (
              <p className={styles.error}>슬롯 로딩에 실패했습니다. 다시 시도해주세요.</p>
            )}
            {targetUid && !loading && !error && (
              <AvailabilityEditor slots={slots} onSave={handleSave} loading={saving} />
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
