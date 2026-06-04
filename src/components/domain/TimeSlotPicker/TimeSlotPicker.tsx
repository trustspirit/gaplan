import clsx from 'clsx'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import type { TimeSlot } from '@/types'
import styles from './TimeSlotPicker.module.scss'

interface TimeSlotPickerProps {
  slots: TimeSlot[]
  granularity?: 'day' | 'time'
  // Single select (ward_visit)
  selected?: TimeSlot | null
  onSelect?: (slot: TimeSlot) => void
  // Multi select (interview / meeting)
  multiSelect?: boolean
  isSlotSelected?: (slot: TimeSlot) => boolean
  onToggle?: (slot: TimeSlot) => void
}

export function TimeSlotPicker({
  slots,
  granularity = 'time',
  selected,
  onSelect,
  multiSelect = false,
  isSlotSelected,
  onToggle,
}: TimeSlotPickerProps) {
  const { t } = useTranslation()
  if (granularity === 'day') {
    const available = slots.filter(s => s.isAvailable)
    return (
      <div className={styles.picker}>
        <div className={styles.dayCards}>
          {available.map(slot => {
            const d = dayjs(slot.date)
            const isSelected = multiSelect
              ? (isSlotSelected?.(slot) ?? false)
              : selected?.date === slot.date
            return (
              <button
                key={slot.date}
                type="button"
                className={clsx(styles.dayCard, isSelected && styles.dayCardSelected)}
                onClick={() => multiSelect ? onToggle?.(slot) : onSelect?.(slot)}
              >
                <span className={styles.dayCardDow}>{d.format('ddd')}</span>
                <span className={styles.dayCardDate}>{d.format('M/D')}</span>
              </button>
            )
          })}
        </div>
        {available.length === 0 && (
          <p className={styles.empty}>{t('schedule.noDates')}</p>
        )}
      </div>
    )
  }

  // Time-level: grouped by date
  const grouped = slots.reduce<Record<string, TimeSlot[]>>((acc, slot) => {
    acc[slot.date] = [...(acc[slot.date] ?? []), slot]
    return acc
  }, {})

  return (
    <div className={styles.picker}>
      {Object.entries(grouped).map(([date, daySlots]) => (
        <div key={date} className={styles.dayGroup}>
          <p className={styles.date}>{dayjs(date).format('M월 D일 (ddd)')}</p>
          <div className={styles.slots}>
            {daySlots.map(slot => {
              const isSelected = multiSelect
                ? (isSlotSelected?.(slot) ?? false)
                : (selected?.date === slot.date && selected?.startTime === slot.startTime)
              return (
                <button
                  key={`${slot.date}-${slot.startTime}`}
                  type="button"
                  className={clsx(
                    styles.slot,
                    !slot.isAvailable && styles.disabled,
                    isSelected && styles.selected,
                  )}
                  disabled={!slot.isAvailable}
                  onClick={() => multiSelect ? onToggle?.(slot) : onSelect?.(slot)}
                >
                  {slot.startTime}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {slots.length === 0 && <p className={styles.empty}>{t('schedule.noSlots')}</p>}
    </div>
  )
}
