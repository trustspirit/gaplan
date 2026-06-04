import { GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { ALL_UNITS } from '@/constants/regions';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
export async function subscribeToSharedCalendar() {
    if (!auth.currentUser)
        throw new Error('로그인이 필요합니다.');
    // Get user's regionId — stored directly on seventy, derived from unitId for president
    const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userData = userSnap.data();
    const regionId = userData?.regionId ??
        ALL_UNITS.find(u => u.id === userData?.unitId)?.regionId ??
        '';
    // Get regional calendar ID from settings
    const settingsSnap = await getDoc(doc(db, 'settings', 'calendar'));
    const calendars = settingsSnap.data()?.calendars ?? {};
    // Fall back to legacy single-calendar field if present
    const sharedCalendarId = calendars[regionId] ?? settingsSnap.data()?.sharedCalendarId;
    if (!sharedCalendarId) {
        throw new Error('이 지역의 공유 캘린더가 설정되지 않았습니다. 관리자에게 문의하세요.');
    }
    // Re-authenticate with calendar scope to get access token
    const provider = new GoogleAuthProvider();
    provider.addScope(CALENDAR_SCOPE);
    const result = await reauthenticateWithPopup(auth.currentUser, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;
    if (!accessToken)
        throw new Error('캘린더 접근 권한을 가져오지 못했습니다.');
    // Subscribe to the regional calendar via Google Calendar API
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: sharedCalendarId }),
    });
    if (!response.ok && response.status !== 409) {
        const err = await response.json();
        throw new Error(err.error?.message ?? '캘린더 구독에 실패했습니다.');
    }
    // 409 = already subscribed — treat as success
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { calendarConnected: true });
}
