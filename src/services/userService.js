import { collection, doc, setDoc, updateDoc, onSnapshot, serverTimestamp, } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/firebase';
export async function inviteUser(email, role, assignedRegionId, invitedBy) {
    await setDoc(doc(db, 'invites', email), {
        role,
        assignedRegionId: assignedRegionId ?? null,
        invitedBy,
        createdAt: serverTimestamp(),
    });
}
export function subscribeToUsers(callback) {
    return onSnapshot(collection(db, 'users'), snap => callback(snap.docs.map(d => ({ uid: d.id, ...d.data() }))), err => console.error('[users] onSnapshot error:', err.code, err.message));
}
export async function updateUserRole(uid, role, regionIds) {
    const regionFields = role === 'seventy' && regionIds && regionIds.length > 0
        ? {
            regionIds,
            regionId: regionIds[0], // keep primary for backward compat
        }
        : {};
    await updateDoc(doc(db, 'users', uid), { role, ...regionFields });
}
export async function updateUserName(uid, name) {
    await updateDoc(doc(db, 'users', uid), { name: name.trim() });
}
export async function deleteUserAccount(uid) {
    await httpsCallable(functions, 'deleteUser')({ uid });
}
