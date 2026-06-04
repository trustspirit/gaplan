import {
  collection, getDocs, doc, writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { AvailabilitySlot, TimeSlot } from '@/types'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { isFastSunday } from '@/utils/fastSunday'
dayjs.extend(isBetween)

export async function getAvailabilitySlots(seventyUid: string): Promise<AvailabilitySlot[]> {
  const snap = await getDocs(collection(db, 'availability', seventyUid, 'slots'))
  return snap.docs.map(d => ({ id: d.id, seventyUid, ...d.data() }) as AvailabilitySlot)
}

export async function saveAvailabilitySlots(
  seventyUid: string,
  slots: Omit<AvailabilitySlot, 'id' | 'seventyUid'>[],
): Promise<void> {
  const batch = writeBatch(db)
  const today = dayjs().format('YYYY-MM-DD')
  const existing = await getDocs(collection(db, 'availability', seventyUid, 'slots'))

  existing.docs.forEach(d => {
    const data = d.data()
    // Delete all recurring slots (will be replaced) + expired past override slots
    if (data.type === 'recurring' || (data.type === 'override' && data.date < today)) {
      batch.delete(d.ref)
    }
  })

  slots.forEach(slot => {
    const ref = doc(collection(db, 'availability', seventyUid, 'slots'))
    batch.set(ref, slot)
  })
  await batch.commit()
}

// Generate time slots for specific dates with per-date times (interview / meeting tasks)
export function computeInterviewSlots(
  dateSlots: { date: string; startTime: string; endTime: string }[],
  slotDurationMinutes = 60,
): TimeSlot[] {
  return dateSlots.flatMap(({ date, startTime, endTime }) => {
    const slots: TimeSlot[] = []
    let t = dayjs(`${date}T${startTime}`)
    const end = dayjs(`${date}T${endTime}`)
    while (t.isBefore(end)) {
      const slotEnd = t.add(slotDurationMinutes, 'minute')
      if (slotEnd.isAfter(end)) break
      slots.push({
        date,
        startTime: t.format('HH:mm'),
        endTime: slotEnd.format('HH:mm'),
        isAvailable: true,
      })
      t = slotEnd
    }
    return slots
  })
}

export function computeAvailableSlots(
  slots: AvailabilitySlot[],
  confirmedDates: string[],
  fromDate: string,
  toDate: string,
): TimeSlot[] {
  const result: TimeSlot[] = []
  let current = dayjs(fromDate)
  const end = dayjs(toDate)

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dateStr = current.format('YYYY-MM-DD')
    const dayOfWeek = current.day()

    if (isFastSunday(current)) {
      current = current.add(1, 'day')
      continue
    }

    const overrideSlot = slots.find(s => s.type === 'override' && s.date === dateStr)
    const recurringSlot = slots.find(
      s => s.type === 'recurring' && s.recurringDays?.includes(dayOfWeek) && !s.isBlocked
    )
    const activeSlot = overrideSlot ?? recurringSlot

    if (activeSlot && !activeSlot.isBlocked) {
      result.push({
        date: dateStr,
        startTime: activeSlot.startTime,
        endTime: activeSlot.endTime,
        isAvailable: !confirmedDates.includes(dateStr),
      })
    }
    current = current.add(1, 'day')
  }
  return result
}
