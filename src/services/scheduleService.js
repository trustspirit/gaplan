import { collection, query, where, onSnapshot, orderBy, } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import dayjs from 'dayjs';
import { db, functions } from '@/firebase';
export function subscribeToSchedules(filters, callback) {
    let q = query(collection(db, 'schedules'), orderBy('date', 'asc'));
    if (filters.presidentUid)
        q = query(q, where('presidentUid', '==', filters.presidentUid));
    else if (filters.seventyUid)
        q = query(q, where('seventyUid', '==', filters.seventyUid));
    else {
        // Admin view: limit to ±6 months to avoid unbounded collection scan
        const sixMonthsAgo = dayjs().subtract(6, 'month').format('YYYY-MM-DD');
        q = query(q, where('date', '>=', sixMonthsAgo));
    }
    return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.error('[schedules] onSnapshot error:', err.code, err.message));
}
export async function confirmSchedule(params) {
    const fn = httpsCallable(functions, 'confirmSchedule');
    const result = await fn(params);
    return result.data;
}
