import { collection, doc, setDoc, updateDoc, onSnapshot, serverTimestamp, } from 'firebase/firestore';
import { db } from '@/firebase';
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
export async function updateUserRole(uid, role, regionId) {
    await updateDoc(doc(db, 'users', uid), { role, ...(regionId ? { regionId } : {}) });
}
