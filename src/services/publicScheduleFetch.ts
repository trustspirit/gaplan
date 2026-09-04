/**
 * firebase/functions의 httpsCallable을 대체한다 — 이 페이지가 부르는 함수는 하나뿐이고
 * 인증도 필요 없는데, SDK 전체(firebase/app 포함, gzip 약 33 kB)를 그것 때문에 싣는 건
 * 공개 엔트리에서 과하다. Callable Functions의 HTTP 프로토콜(공개 문서화된 안정된 규약:
 * POST {data} → 성공 시 {result}, 실패 시 {error: {status, message}})을 직접 구현한다.
 * URL 패턴은 이 파일의 buildSubscribeUrls가 publicScheduleIcs를 직접 fetch할 때 쓰는 것과
 * 같다 — 이 코드베이스에 이미 있는 방식이다.
 */
function callableUrl(name: string): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string
  return `https://asia-northeast3-${projectId}.cloudfunctions.net/${name}`
}

export interface CallableError extends Error {
  code: string
}

/**
 * 서버가 던진 HttpsError의 status(예: 'PERMISSION_DENIED')를 클라이언트 SDK와 같은 모양의
 * code('functions/permission-denied')로 되살린다. PublicSchedulePage의 isPermission 분기가
 * 이 code만 보므로(메시지 문자열은 보지 않는다), 이 변환을 빼먹으면 비공개 링크가 "오류" 화면으로
 * 잘못 뜨는 조용한 회귀가 된다.
 */
function toCallableError(status: string | undefined, message: string): CallableError {
  const err = new Error(message) as CallableError
  err.code = `functions/${(status ?? 'UNKNOWN').toLowerCase().replace(/_/g, '-')}`
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
  })
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw toCallableError(body?.error?.status, body?.error?.message ?? `HTTP ${res.status}`)
  }
  return body?.result as TResponse
}
