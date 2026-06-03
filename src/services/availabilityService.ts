import {
  collection, getDocs, doc, writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { AvailabilitySlot, TimeSlot } from '@/types'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
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
  const existing = await getDocs(collection(db, 'availability', seventyUid, 'slots'))
  existing.docs
    .filter(d => d.data().type === 'recurring')
    .forEach(d => batch.delete(d.ref))
  slots.forEach(slot => {
    const ref = doc(collection(db, 'availability', seventyUid, 'slots'))
    batch.set(ref, slot)
  })
  await batch.commit()
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

    // Skip fast Sunday (first Sunday of month)
    const firstSunday = (() => {
      const first = current.startOf('month')
      const dow = first.day()
      return first.add(dow === 0 ? 0 : 7 - dow, 'day')
    })()
    if (dateStr === firstSunday.format('YYYY-MM-DD')) {
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
