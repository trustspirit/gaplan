/** `/recommend/{requestId}/{token}`의 두 조각. 라우터 없이 읽는다(이 엔트리는 react-router를 싣지 않는다). */
export function recommendParams(pathname: string): { requestId?: string; token?: string } {
  const m = pathname.match(/^\/recommend\/([^/]+)\/([^/]+)\/?$/)
  if (!m) return {}
  return { requestId: decodeURIComponent(m[1]), token: decodeURIComponent(m[2]) }
}
