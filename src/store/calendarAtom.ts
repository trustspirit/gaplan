import { atom } from 'jotai'
import type { TimeSlot } from '@/types'

export const selectedSlotAtom = atom<TimeSlot | null>(null)
export const calendarViewAtom = atom<'month' | 'week'>('month')
