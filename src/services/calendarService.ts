import { GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'

export async function subscribeToSharedCalendar(): Promise<void> {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.')

  // Re-authenticate with calendar scope to get access token
  const provider = new GoogleAuthProvider()
  provider.addScope(CALENDAR_SCOPE)

  const result = await reauthenticateWithPopup(auth.currentUser, provider)
  const credential = GoogleAuthProvider.credentialFromResult(result)
  const accessToken = credential?.accessToken
  if (!accessToken) throw new Error('캘린더 접근 권한을 가져오지 못했습니다.')

  // Get shared calendar ID from Firestore settings
  const settingsSnap = await getDoc(doc(db, 'settings', 'calendar'))
  const sharedCalendarId = settingsSnap.data()?.sharedCalendarId
  if (!sharedCalendarId) {
    throw new Error('공유 캘린더가 설정되지 않았습니다. 관리자에게 문의하세요.')
  }

  // Subscribe to the shared calendar via Google Calendar API
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: sharedCalendarId }),
    }
  )

  if (!response.ok && response.status !== 409) {
    const err = await response.json()
    throw new Error(err.error?.message ?? '캘린더 구독에 실패했습니다.')
  }
  // 409 = already subscribed — treat as success

  // Mark user as calendar-connected
  await updateDoc(doc(db, 'users', auth.currentUser!.uid), { calendarConnected: true })
}
