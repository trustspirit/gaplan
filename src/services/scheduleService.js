import { collection, query, where, onSnapshot, orderBy, doc, setDoc, serverTimestamp, } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import dayjs from 'dayjs';
import { db, functions, auth } from '@/firebase';
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
export async function adminConfirmSchedule(params) {
    const fn = httpsCallable(functions, 'adminConfirmSchedule');
    const result = await fn(params);
    return result.data;
}
export async function updateSchedule(scheduleId, updates) {
    await import('firebase/firestore').then(({ doc, updateDoc }) => updateDoc(doc(db, 'schedules', scheduleId), updates));
}
export async function deleteSchedule(scheduleId) {
    await import('firebase/firestore').then(({ doc, deleteDoc }) => deleteDoc(doc(db, 'schedules', scheduleId)));
}
export async function createVisitSchedules(seventyUid, entries) {
    const currentUser = auth.currentUser;
    if (!currentUser)
        throw new Error('인증이 필요합니다.');
    await Promise.all(entries.map(entry => {
        const scheduleId = `${seventyUid}_${entry.unitId}_${entry.date}`;
        const ref = doc(db, 'schedules', scheduleId);
        return setDoc(ref, {
            type: 'ward_visit',
            seventyUid,
            unitId: entry.unitId,
            presidentUid: entry.presidentUid,
            date: entry.date,
            startTime: '10:00',
            endTime: '13:00',
            status: 'confirmed',
            createdBy: currentUser.uid,
            confirmedAt: serverTimestamp(),
        });
    }));
}
