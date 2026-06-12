import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, getDoc, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import type { VisitPlan, VisitPlanItem } from '@/types'
import { mapDocs, snapshotErrHandler } from './_utils'

export function subscribeToVisitPlans(
  callback: (plans: VisitPlan[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'visitPlans'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    snap => callback(mapDocs<VisitPlan>(snap)),
    snapshotErrHandler('visitPlans', onError),
  )
}

export async function getVisitPlan(id: string): Promise<VisitPlan | null> {
  const snap = await getDoc(doc(db, 'visitPlans', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as VisitPlan) : null
}

export async function createVisitPlan(
  title: string,
  seventyUid: string,
  createdBy: string,
): Promise<string> {
  const ref = await addDoc(collection(db, 'visitPlans'), {
    title,
    seventyUid,
    status: 'draft',
    items: [],
    createdBy,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateVisitPlanItems(id: string, items: VisitPlanItem[]): Promise<void> {
  await updateDoc(doc(db, 'visitPlans', id), { items })
}

export async function updateVisitPlanTitle(id: string, title: string): Promise<void> {
  await updateDoc(doc(db, 'visitPlans', id), { title })
}

export async function updateVisitPlanProject(id: string, projectId: string): Promise<void> {
  await updateDoc(doc(db, 'visitPlans', id), { projectId: projectId || null })
}

export async function deleteVisitPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, 'visitPlans', id))
}

export async function publishVisitPlan(planId: string): Promise<void> {
  const fn = httpsCallable<{ planId: string }, { success: boolean }>(functions, 'publishVisitPlan')
  await fn({ planId })
}
