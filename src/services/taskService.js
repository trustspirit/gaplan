import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, addDoc, serverTimestamp, } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/firebase';
// President: pending + responded tasks (responded = awaiting admin/seventy confirmation)
export function subscribeToTasks(assignedTo, callback) {
    const q = query(collection(db, 'tasks'), where('assignedTo', '==', assignedTo), where('status', 'in', ['pending', 'responded']), orderBy('dueDate', 'asc'));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error('[tasks] onSnapshot error:', err.code, err.message));
}
// Admin/Seventy: all tasks (seventy filtered by seventyUid via Firestore rules + query)
export function subscribeToAllTasks(callback, seventyUid) {
    let q = query(collection(db, 'tasks'), orderBy('dueDate', 'asc'));
    if (seventyUid) {
        q = query(q, where('seventyUid', '==', seventyUid));
    }
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error('[tasks] onSnapshot error:', err.code, err.message));
}
export async function completeTask(taskId) {
    await updateDoc(doc(db, 'tasks', taskId), { status: 'completed' });
}
export async function expireTask(taskId) {
    await updateDoc(doc(db, 'tasks', taskId), { status: 'expired' });
}
export async function updateTaskDetails(taskId, updates, resetResponse = false) {
    await updateDoc(doc(db, 'tasks', taskId), {
        ...updates,
        ...(resetResponse ? {
            status: 'pending',
            respondedSlots: [],
            wardAssignments: [],
            respondedAt: null,
        } : {}),
    });
}
export async function submitAvailability(params) {
    const fn = httpsCallable(functions, 'submitAvailability');
    const result = await fn(params);
    return result.data;
}
export async function submitWardAssignments(params) {
    const fn = httpsCallable(functions, 'submitWardAssignments');
    const result = await fn(params);
    return result.data;
}
export async function createTask(params) {
    const ref = await addDoc(collection(db, 'tasks'), {
        ...params, status: 'pending', notifiedAt: [], createdAt: serverTimestamp(),
    });
    return ref.id;
}
