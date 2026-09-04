const PREFIX = '/public/schedule/'

/** 공개 엔트리에는 라우터가 없다 — 이 한 줄이 라우팅의 전부다. */
export function tokenFromPathname(pathname: string): string | undefined {
  if (!pathname.startsWith(PREFIX)) return undefined
  const rest = pathname.slice(PREFIX.length).replace(/\/+$/, '')
  return rest || undefined
}
