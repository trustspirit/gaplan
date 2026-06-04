import { useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import type { AvailabilitySlot } from '@/types'
import { Button, Input } from '@/components/ui'
import styles from './AvailabilityEditor.module.scss'

interface AvailabilityEditorProps {
  slots: AvailabilitySlot[]
  onSave: (slots: Omit<AvailabilitySlot, 'id' | 'seventyUid'>[]) => void
  loading?: boolean
}
export function AvailabilityEditor({ slots, onSave, loading }: AvailabilityEditorProps) {
  const { t } = useTranslation()
  // Use dayjs locale-aware day abbreviations
  const DAYS = Array.from({ length: 7 }, (_, i) => dayjs().day(i).format('ddd'))

  const existingRecurring = slots.filter(s => s.type === 'recurring' && !s.isBlocked)
  const [recurringDays, setRecurringDays] = useState<number[]>(
    existingRecurring.flatMap(s => s.recurringDays ?? [])
  )
  const [startTime, setStartTime] = useState(existingRecurring[0]?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(existingRecurring[0]?.endTime ?? '18:00')

  const toggleDay = (day: number) =>
    setRecurringDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const handleSave = () => {
    const newSlots: Omit<AvailabilitySlot, 'id' | 'seventyUid'>[] = recurringDays.map(day => ({
      type: 'recurring', recurringDays: [day], startTime, endTime, isBlocked: false,
    }))
    onSave(newSlots)
  }

  return (
    <div className={styles.editor}>
      <p className={styles.section}>{t('availability.selectDays')}</p>
      <div className={styles.days}>
        {DAYS.map((d, i) => (
          <button
            key={i}
            className={clsx(styles.dayBtn, recurringDays.includes(i) && styles.selected)}
            onClick={() => toggleDay(i)}
          >
            {d}
          </button>
        ))}
      </div>
      <div className={styles.timeRow}>
        <Input label={t('common.startTime')} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        <Input label={t('common.endTime')} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
      </div>
      <Button onClick={handleSave} loading={loading} fullWidth>{t('common.save')}</Button>
    </div>
  )
}
