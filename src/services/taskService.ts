import {
  collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, addDoc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import type { Task, RespondedSlot } from '@/types'

// President: pending + responded tasks (responded = awaiting admin/seventy confirmation)
export function subscribeToTasks(assignedTo: string, callback: (tasks: Task[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'tasks'),
    where('assignedTo', '==', assignedTo),
    where('status', 'in', ['pending', 'responded']),
    orderBy('dueDate', 'asc'),
  )
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Task)),
    err => console.error('[tasks] onSnapshot error:', err.code, err.message),
  )
}

// Admin/Seventy: all tasks regardless of assignee or status
export function subscribeToAllTasks(callback: (tasks: Task[]) => void): Unsubscribe {
  const q = query(collection(db, 'tasks'), orderBy('dueDate', 'asc'))
  return onSnapshot(q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Task)),
    err => console.error('[tasks] onSnapshot error:', err.code, err.message),
  )
}

export async function completeTask(taskId: string): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { status: 'completed' })
}

export async function expireTask(taskId: string): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), { status: 'expired' })
}

export async function updateTaskDetails(
  taskId: string,
  updates: {
    dueDate?: string
    availableDates?: string[]
    availableStartTime?: string
    availableEndTime?: string
    slotDurationMinutes?: number
  },
  resetResponse = false,
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), {
    ...updates,
    ...(resetResponse ? { status: 'pending', respondedSlots: [], respondedAt: null } : {}),
  })
}

interface SubmitAvailabilityParams {
  taskId: string
  slots: RespondedSlot[]
}
interface SubmitAvailabilityResult { success: boolean; error?: string }

export async function submitAvailability(params: SubmitAvailabilityParams): Promise<SubmitAvailabilityResult> {
  const fn = httpsCallable<SubmitAvailabilityParams, SubmitAvailabilityResult>(functions, 'submitAvailability')
  const result = await fn(params)
  return result.data
}

export async function createTask(params: {
  type: 'select_visit' | 'select_interview' | 'select_meeting'
  assignedTo: string
  seventyUid: string
  regionId: string
  dueDate: string
  createdBy: string
  availableDays: number[]
  availableDates?: string[]
  availableStartTime?: string
  availableEndTime?: string
  slotDurationMinutes?: number
}): Promise<string> {
  const ref = await addDoc(collection(db, 'tasks'), {
    ...params, status: 'pending', notifiedAt: [], createdAt: serverTimestamp(),
  })
  return ref.id
}
