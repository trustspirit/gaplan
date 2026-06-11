import {
  doc, setDoc, updateDoc,
  onSnapshot, collection, serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/firebase'
import type { AppUser, UserRole, SecondaryRole } from '@/types'

export async function inviteUser(
  email: string,
  role: UserRole,
  assignedRegionIds: string[] | undefined,
  invitedBy: string,
  assignedSeventyUid?: string,
  secondaryRole?: SecondaryRole | null,
  unitId?: string,
): Promise<void> {
  await setDoc(doc(db, 'invites', email), {
    role,
    secondaryRole: secondaryRole ?? null,
    assignedRegionIds: assignedRegionIds ?? [],
    assignedRegionId: assignedRegionIds?.[0] ?? null,
    assignedSeventyUid: assignedSeventyUid ?? null,
    unitId: unitId ?? null,
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
  regionIds?: string[],
  assignedSeventyUid?: string,
  secondaryRole?: SecondaryRole | null,
  unitId?: string,
): Promise<void> {
  const fields: Record<string, unknown> = { role }

  if (role === 'admin') {
    fields.secondaryRole = secondaryRole ?? null
    if (secondaryRole === 'exec_secretary') {
      fields.assignedSeventyUid = assignedSeventyUid || null
      fields.regionIds = null; fields.regionId = null; fields.unitId = null
    } else if (secondaryRole === 'seventy') {
      const rIds = regionIds ?? []
      fields.regionIds = rIds; fields.regionId = rIds[0] ?? null
      fields.assignedSeventyUid = null; fields.unitId = null
    } else if (secondaryRole === 'president') {
      fields.unitId = unitId || null
      fields.assignedSeventyUid = null; fields.regionIds = null; fields.regionId = null
    } else {
      fields.assignedSeventyUid = null; fields.regionIds = null; fields.regionId = null; fields.unitId = null
    }
  } else {
    fields.secondaryRole = null
    fields.unitId = null
    if (role === 'seventy' && regionIds && regionIds.length > 0) {
      fields.regionIds = regionIds; fields.regionId = regionIds[0]
    } else {
      fields.regionIds = null; fields.regionId = null
    }
    fields.assignedSeventyUid = role === 'exec_secretary' ? (assignedSeventyUid || null) : null
  }

  await updateDoc(doc(db, 'users', uid), fields)
}

export async function updateUserName(uid: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { name: name.trim() })
}

export async function deleteUserAccount(uid: string): Promise<void> {
  await httpsCallable(functions, 'deleteUser')({ uid })
}

export async function updatePreRegisteredUserFields(
  uid: string,
  fields: { name?: string; email?: string; role?: 'president' | 'seventy'; unitId?: string | null; regionId?: string | null; regionIds?: string[] },
): Promise<void> {
  await httpsCallable(functions, 'adminUpdatePreRegisteredUser')({ uid, ...fields })
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
