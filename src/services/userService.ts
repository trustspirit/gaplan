import {
  collection, doc, setDoc, updateDoc,
  onSnapshot, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { AppUser, UserRole } from '@/types'

export async function inviteUser(
  email: string,
  role: UserRole,
  assignedRegionId: string | undefined,
  invitedBy: string,
): Promise<void> {
  await setDoc(doc(db, 'invites', email), {
    role,
    assignedRegionId: assignedRegionId ?? null,
    invitedBy,
    createdAt: serverTimestamp(),
  })
}

export function subscribeToUsers(callback: (users: AppUser[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'users'), snap => {
    callback(snap.docs.map(d => ({ uid: d.id, ...d.data() }) as AppUser))
  })
}

export async function updateUserRole(uid: string, role: UserRole, regionId?: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role, ...(regionId ? { regionId } : {}) })
}
