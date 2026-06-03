import { atom } from 'jotai'
import type { Task } from '@/types'

export const taskModalOpenAtom = atom(false)
export const selectedTaskAtom = atom<Task | null>(null)
export const scheduleModalOpenAtom = atom(false)
