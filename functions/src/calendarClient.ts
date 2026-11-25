import type { calendar_v3 } from 'googleapis'

let client: Promise<calendar_v3.Calendar> | null = null

/**
 * Google Calendar 클라이언트. googleapis는 처음 쓸 때 불러온다 — index.ts가 모든 함수를 한 모듈로
 * 내보내므로 최상위에서 import하면 캘린더와 상관없는 함수(공개 추천 링크 등)도 콜드 스타트마다
 * 이 큰 패키지를 읽는다(로컬에서 전체 로드 약 430 ms 중 약 320 ms).
 */
export function getCalendarClient(): Promise<calendar_v3.Calendar> {
  if (!client) {
    client = import('googleapis')
      .then(({ google }) => {
        const auth = new google.auth.GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/calendar.events'],
        })
        return google.calendar({ version: 'v3', auth })
      })
      .catch((e) => {
        client = null // 다음 호출에서 다시 시도
        throw e
      })
  }
  return client
}
