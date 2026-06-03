import { collection, query, where, onSnapshot, orderBy, } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/firebase';
export function subscribeToSchedules(filters, callback) {
    let q = query(collection(db, 'schedules'), orderBy('date', 'asc'));
    if (filters.presidentUid)
        q = query(q, where('presidentUid', '==', filters.presidentUid));
    if (filters.seventyUid)
        q = query(q, where('seventyUid', '==', filters.seventyUid));
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
}
export async function confirmSchedule(params) {
    const fn = httpsCallable(functions, 'confirmSchedule');
    const result = await fn(params);
    return result.data;
}
