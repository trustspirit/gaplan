import clsx from 'clsx'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
dayjs.locale('ko')
import type { TimeSlot } from '@/types'
import styles from './TimeSlotPicker.module.scss'

interface TimeSlotPickerProps {
  slots: TimeSlot[]
  selected: TimeSlot | null
  onSelect: (slot: TimeSlot) => void
  granularity?: 'day' | 'time'  // 'day' = ward_visit, 'time' = interview
}

export function TimeSlotPicker({ slots, selected, onSelect, granularity = 'time' }: TimeSlotPickerProps) {
  if (granularity === 'day') {
    // Day-level: each slot is one selectable date card (no time shown)
    return (
      <div className={styles.picker}>
        <div className={styles.dayCards}>
          {slots.filter(s => s.isAvailable).map(slot => {
            const d = dayjs(slot.date)
            const isSelected = selected?.date === slot.date
            return (
              <button
                key={slot.date}
                type="button"
                className={clsx(styles.dayCard, isSelected && styles.dayCardSelected)}
                onClick={() => onSelect(slot)}
              >
                <span className={styles.dayCardDow}>{d.format('ddd')}</span>
                <span className={styles.dayCardDate}>{d.format('M/D')}</span>
              </button>
            )
          })}
        </div>
        {slots.filter(s => s.isAvailable).length === 0 && (
          <p className={styles.empty}>가능한 날짜가 없습니다.</p>
        )}
      </div>
    )
  }

  // Time-level: grouped by date, show time buttons within each date
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
            {daySlots.map(slot => (
              <button
                key={`${slot.date}-${slot.startTime}`}
                type="button"
                className={clsx(
                  styles.slot,
                  !slot.isAvailable && styles.disabled,
                  selected?.date === slot.date && selected?.startTime === slot.startTime && styles.selected,
                )}
                disabled={!slot.isAvailable}
                onClick={() => onSelect(slot)}
              >
                {slot.startTime}
              </button>
            ))}
          </div>
        </div>
      ))}
      {slots.length === 0 && <p className={styles.empty}>가능한 슬롯이 없습니다.</p>}
    </div>
  )
}
