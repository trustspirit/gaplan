import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAvailability } from '@/hooks/useAvailability'
import { useUsers } from '@/hooks/useUsers'
import { saveAvailabilitySlots } from '@/services/availabilityService'
import { useTopBar } from '@/hooks/useTopBar'
import { Card, CardHeader, CardBody, Select, Skeleton } from '@/components/ui'
import { AvailabilityEditor } from '@/components/domain/AvailabilityEditor/AvailabilityEditor'
import type { AvailabilitySlot } from '@/types'
import styles from './AvailabilitySettings.module.scss'

export function AvailabilitySettings() {
  const { t } = useTranslation()
  useTopBar({ subtext: t('admin.availabilityTitle') })
  const { users } = useUsers()
  const seventies = users.filter((u) => u.role === 'seventy')
  const [targetUid, setTargetUid] = useState('')
  const { slots, loading, error } = useAvailability(targetUid)
  const [saving, setSaving] = useState(false)

  const seventyOptions = seventies.map((s) => ({ value: s.uid, label: s.name }))

  const handleSave = async (newSlots: Omit<AvailabilitySlot, 'id' | 'seventyUid'>[]) => {
    if (!targetUid) return
    setSaving(true)
    try {
      await saveAvailabilitySlots(targetUid, newSlots)
      toast.success(t('admin.availabilitySaved'))
    } catch {
      toast.error(t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <Card>
        <CardHeader title={t('admin.availabilityTitle')} />
        <CardBody>
          <Select
            label={t('admin.selectSeventyLabel')}
            value={targetUid}
            onChange={(e) => setTargetUid(e.target.value)}
            options={seventyOptions}
          />
          {targetUid && loading && <Skeleton height="160px" className={styles.skeleton} />}
          {targetUid && error && <p className={styles.error}>{t('admin.slotsLoadFailed')}</p>}
          {targetUid && !loading && !error && (
            <AvailabilityEditor
              key={targetUid}
              slots={slots}
              onSave={handleSave}
              loading={saving}
            />
          )}
        </CardBody>
      </Card>
    </div>
  )
}
