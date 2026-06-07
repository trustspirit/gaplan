import {
  doc, setDoc, updateDoc,
  onSnapshot, collection, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import type { AppUser, UserRole } from '@/types'

export async function inviteUser(
  email: string,
  role: UserRole,
  assignedRegionIds: string[] | undefined,
  invitedBy: string,
): Promise<void> {
  await setDoc(doc(db, 'invites', email), {
    role,
    assignedRegionIds: assignedRegionIds ?? [],
    assignedRegionId: assignedRegionIds?.[0] ?? null,  // backward compat
    invitedBy,
    createdAt: serverTimestamp(),
  })
}

export function subscribeToUsers(callback: (users: AppUser[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'users'),
    snap => callback(snap.docs.map(d => ({ uid: d.id, ...d.data() }) as AppUser)),
    err => console.error('[users] onSnapshot error:', err.code, err.message),
  )
}

export async function updateUserRole(
  uid: string,
  role: UserRole,
  regionIds?: string[],   // multiple regions for seventy
): Promise<void> {
  const regionFields = role === 'seventy' && regionIds && regionIds.length > 0
    ? {
        regionIds,
        regionId: regionIds[0],  // keep primary for backward compat
      }
    : {}
  await updateDoc(doc(db, 'users', uid), { role, ...regionFields })
}

export async function updateUserName(uid: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { name: name.trim() })
}

export async function deleteUserAccount(uid: string): Promise<void> {
  await httpsCallable(functions, 'deleteUser')({ uid })
}

export async function addPreRegisteredUser(data: {
  name: string
  email: string
  role: 'president' | 'seventy'
  unitId?: string
  regionId?: string
  regionIds?: string[]
}): Promise<void> {
  await httpsCallable(functions, 'adminAddPreRegisteredUser')(data)
}

export async function deletePreRegisteredUser(uid: string): Promise<void> {
  await httpsCallable(functions, 'adminDeletePreRegisteredUser')({ uid })
}
