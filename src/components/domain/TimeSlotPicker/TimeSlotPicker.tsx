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
}
export function TimeSlotPicker({ slots, selected, onSelect }: TimeSlotPickerProps) {
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
