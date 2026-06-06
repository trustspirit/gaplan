import dayjs from 'dayjs'
import styles from './SlotSelectionGrid.module.scss'

interface TimeRange {
  startTime: string
  endTime: string
}

interface AvailableDateSlot {
  date: string
  timeRanges: TimeRange[]
}

interface SelectedSlot {
  date: string
  startTime: string
  endTime: string
}

interface Props {
  availableDateSlots: AvailableDateSlot[]
  selectedSlots: SelectedSlot[]
  onToggle: (slot: SelectedSlot) => void
}

function slotKey(slot: { date: string; startTime: string; endTime: string }): string {
  return `${slot.date}_${slot.startTime}_${slot.endTime}`
}

export function SlotSelectionGrid({ availableDateSlots, selectedSlots, onToggle }: Props) {
  const selectedKeys = new Set(selectedSlots.map(slotKey))

  return (
    <div className={styles.container}>
      {availableDateSlots.map(({ date, timeRanges }) => (
        <div key={date} className={styles.dateGroup}>
          <div className={styles.dateHeader}>
            {dayjs(date).format('M월 D일 (ddd)')}
          </div>
          <div className={styles.slotList}>
            {timeRanges.map(({ startTime, endTime }) => {
              const slot = { date, startTime, endTime }
              const isSelected = selectedKeys.has(slotKey(slot))
              return (
                <button
                  key={`${startTime}_${endTime}`}
                  type="button"
                  className={`${styles.slotButton}${isSelected ? ` ${styles.selected}` : ''}`}
                  onClick={() => onToggle(slot)}
                >
                  {startTime} – {endTime}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
