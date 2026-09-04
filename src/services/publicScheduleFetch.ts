/**
 * firebase/functions의 httpsCallable을 대체한다 — 이 페이지가 부르는 함수는 하나뿐이고
 * 인증도 필요 없는데, SDK 전체(firebase/app 포함, gzip 약 33 kB)를 그것 때문에 싣는 건
 * 공개 엔트리에서 과하다. Callable Functions의 HTTP 프로토콜(POST {data} → 성공 시
 * {data} 또는 {result}, 실패 시 {error: {status, message}})을 직접 구현한다.
 *
 * 응답 봉투와 에러 code 변환은 SDK의 동작(@firebase/functions의 index.esm.js)을 그대로
 * 따라간다 — 여기서 어긋나면 PublicSchedulePage의 분기들이 조용히 틀어진다.
 *
 * URL 규칙은 PublicSchedulePage.tsx의 buildSubscribeUrls가 publicScheduleIcs를 직접
 * 가리킬 때 쓰는 것과 같다 — 이 코드베이스에 이미 있는 방식이다.
 */

/** httpsCallable의 기본값과 같다. raw fetch는 타임아웃이 없어 이걸 안 걸면 멈춘 요청이
 *  스켈레톤을 브라우저 기본 타임아웃까지 붙잡는다(예전엔 70초 뒤 에러 화면으로 떨어졌다). */
const CALLABLE_TIMEOUT_MS = 70_000

function callableUrl(name: string): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string
  return `https://asia-northeast3-${projectId}.cloudfunctions.net/${name}`
}

export interface CallableError extends Error {
  code: string
}

/** HTTP 상태만으로 정하는 code — 본문이 JSON이 아니거나 error.status가 없을 때 쓴다
 *  (인프라가 돌려주는 403/502/504 HTML 등). SDK도 같은 순서로 판단한다. */
function codeForHttpStatus(status: number): string {
  if (status === 400) return 'invalid-argument'
  if (status === 401) return 'unauthenticated'
  if (status === 403) return 'permission-denied'
  if (status === 404) return 'not-found'
  if (status === 409) return 'aborted'
  if (status === 429) return 'resource-exhausted'
  if (status === 499) return 'cancelled'
  if (status === 500) return 'internal'
  if (status === 501) return 'unimplemented'
  if (status === 503) return 'unavailable'
  if (status === 504) return 'deadline-exceeded'
  return 'unknown'
}

/**
 * 서버가 던진 HttpsError의 status(예: 'PERMISSION_DENIED')를 클라이언트 SDK와 같은 모양의
 * code('functions/permission-denied')로 되살린다. PublicSchedulePage의 isPermission 분기가
 * 이 code만 보므로(메시지 문자열은 보지 않는다), 이 변환을 빼먹으면 비공개 링크가 "오류" 화면으로
 * 잘못 뜨는 조용한 회귀가 된다.
 */
function toCallableError(httpStatus: number, status: string | undefined, message: string): CallableError {
  const slug = status ? status.toLowerCase().replace(/_/g, '-') : codeForHttpStatus(httpStatus)
  const err = new Error(message) as CallableError
  err.code = `functions/${slug}`
  return err
}

export async function callPublicFunction<TRequest, TResponse>(
  name: string,
  data: TRequest,
): Promise<TResponse> {
  const res = await fetch(callableUrl(name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(CALLABLE_TIMEOUT_MS),
  })
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw toCallableError(res.status, body?.error?.status, body?.error?.message ?? `HTTP ${res.status}`)
  }

  // SDK와 같은 순서: data가 정식 필드이고 result는 하위 호환 폴백이다
  // (@firebase/functions index.esm.js:641-649). 어느 쪽이 오든 받는다.
  const payload = body?.data !== undefined ? body.data : body?.result
  if (payload === undefined) {
    throw toCallableError(res.status, 'INTERNAL', 'Response is missing data field.')
  }
  return payload as TResponse
}
