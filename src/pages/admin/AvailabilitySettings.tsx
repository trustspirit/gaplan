import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { toast } from 'sonner'
import { authUserAtom } from '@/store/authAtom'
import { useAvailability } from '@/hooks/useAvailability'
import { saveAvailabilitySlots } from '@/services/availabilityService'
import { AppShell, Sidebar, TopBar } from '@/components/layout'
import { Card, CardHeader, CardBody } from '@/components/ui'
import { AvailabilityEditor } from '@/components/domain'
import type { AvailabilitySlot } from '@/types'
import styles from './AvailabilitySettings.module.scss'

export function AvailabilitySettings() {
  const user = useAtomValue(authUserAtom)!
  const targetUid = user.uid
  const { slots, loading } = useAvailability(targetUid)
  const [saving, setSaving] = useState(false)

  const handleSave = async (newSlots: Omit<AvailabilitySlot, 'id' | 'seventyUid'>[]) => {
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
      sidebar={<Sidebar role={user.role} name={user.name} />}
      topBar={<TopBar name={user.name} subtext="가능 일정 설정" />}
    >
      <div className={styles.page}>
        <Card>
          <CardHeader title="가능 일정 설정" />
          <CardBody>
            {!loading && <AvailabilityEditor slots={slots} onSave={handleSave} loading={saving} />}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  )
}
