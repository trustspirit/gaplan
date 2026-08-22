// 저장된 Zoom 링크(개인, userSettings/{uid}.zoomLinks) 검증 규칙.
// Firestore/서비스 계층과 분리된 순수 함수로 둬 단위 테스트로 직접 고정한다.

export interface ZoomLink {
  id: string
  label: string
  url: string
}

export const MAX_ZOOM_LINKS = 10

export type ZoomLinkRejection = 'invalid_url' | 'duplicate' | 'empty_label' | 'limit_reached'

export type ZoomLinkValidationResult = { ok: true } | { ok: false; reason: ZoomLinkRejection }

export function isHttpUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 새 링크 하나를 저장해도 되는지 판정한다. 순서는 의도적이다 — URL 형식이 잘못됐으면
 * 라벨을 채웠는지는 따질 필요가 없으므로 URL부터 본다.
 */
export function validateNewZoomLink(
  existing: Pick<ZoomLink, 'url'>[],
  input: { label: string; url: string },
): ZoomLinkValidationResult {
  const url = input.url.trim()
  if (!isHttpUrl(url)) return { ok: false, reason: 'invalid_url' }
  if (existing.some((l) => l.url.trim() === url)) return { ok: false, reason: 'duplicate' }
  if (!input.label.trim()) return { ok: false, reason: 'empty_label' }
  if (existing.length >= MAX_ZOOM_LINKS) return { ok: false, reason: 'limit_reached' }
  return { ok: true }
}
