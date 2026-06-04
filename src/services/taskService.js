import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, addDoc, serverTimestamp, } from 'firebase/firestore';
import { db } from '@/firebase';
export function subscribeToTasks(assignedTo, callback) {
    const q = query(collection(db, 'tasks'), where('assignedTo', '==', assignedTo), where('status', '==', 'pending'), orderBy('dueDate', 'asc'));
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error('[tasks] onSnapshot error:', err.code, err.message));
}
export async function completeTask(taskId) {
    await updateDoc(doc(db, 'tasks', taskId), { status: 'completed' });
}
export async function createTask(params) {
    const ref = await addDoc(collection(db, 'tasks'), {
        ...params, status: 'pending', notifiedAt: [], createdAt: serverTimestamp(),
    });
    return ref.id;
}
