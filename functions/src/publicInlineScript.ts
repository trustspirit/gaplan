import type { PublicSchedulePayload } from './publicSchedulePayload'

export const INLINE_DATA_ID = '__public_data__'

/** 이걸 넘으면 심지 않는다. HTML이 무거워져 왕복 하나 아낀 이득이 뒤집히는 지점. */
export const MAX_INLINE_BYTES = 256 * 1024

/**
 * 서버가 이미 아는 데이터를 문서에 실어 보낸다 — 클라이언트가 같은 걸 다시 물어보는
 * 두 번째 왕복(콜드 스타트 가능)을 없애려는 것이다.
 *
 * token을 함께 싣는 이유: CDN이나 브라우저 캐시가 다른 토큰의 문서를 내주는 사고를
 * 클라이언트가 스스로 알아채고 버릴 수 있어야 한다.
 */
export function buildInlineDataScript(token: string, payload: PublicSchedulePayload): string {
  const json = JSON.stringify({ token, data: payload })
  if (Buffer.byteLength(json, 'utf8') > MAX_INLINE_BYTES) return ''

  // JSON.stringify는 '<'를 그대로 둔다 — 노트에 '</script>'가 있으면 태그가 거기서
  // 끊긴다. '<'만 유니코드 이스케이프하면 JSON.parse 결과는 원문 그대로다.
  const safe = json.replace(/</g, '\\u003c')
  return `<script type="application/json" id="${INLINE_DATA_ID}">${safe}</script>`
}
