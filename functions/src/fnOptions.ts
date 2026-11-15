// v2 함수 공통 옵션.
//
// serviceAccount: v1 시절 런타임 계정(App Engine 기본 SA)을 그대로 쓴다. 공유 Google
// 캘린더가 이 계정에 쓰기 권한을 준 상태라, v2 기본값(compute SA)으로 바뀌면
// calendarSync·generalScheduleCalendarSync·manualCalendarSync가 403으로 멈춘다.
export const REGION = 'asia-northeast3'
const RUNTIME_SERVICE_ACCOUNT = 'gaplan-fccfe@appspot.gserviceaccount.com'

/** Firestore 트리거·스케줄 함수 */
export const BACKGROUND_OPTS = { region: REGION, serviceAccount: RUNTIME_SERVICE_ACCOUNT }

/** 브라우저가 부르는 onCall/onRequest — invoker: 'public'이 없으면 Cloud Run이 CORS preflight를 막는다 */
export const PUBLIC_HTTP_OPTS = { ...BACKGROUND_OPTS, invoker: 'public' as const }
