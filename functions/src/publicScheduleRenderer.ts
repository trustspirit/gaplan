import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { getScopeDisplayName } from './regions'
import { createTtlCache } from './publicScheduleRendererCache'
import { buildPublicSchedulePayload, type FirestoreLike } from './publicSchedulePayload'
import { buildInlineDataScript } from './publicInlineScript'

const HOSTING_URL = 'https://gaplan-fccfe.web.app'
const HTML_CACHE_TTL_MS = 5 * 60 * 1000
const TITLE_CACHE_TTL_MS = 5 * 60 * 1000

const indexHtmlCache = createTtlCache<string>(HTML_CACHE_TTL_MS)
const titleCache = new Map<string, { title: string; cachedAt: number }>()

const PAYLOAD_CACHE_TTL_MS = 5 * 60 * 1000
const payloadCache = new Map<string, { script: string; cachedAt: number }>()

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/**
 * 공개 페이지 전용 엔트리를 받아온다. 로그인 앱의 index.html은 firebase auth·
 * firestore와 전체 i18n 사전까지 끌고 오는데(gzip 258 kB), 공개 방문자에게는
 * 아무것도 쓰이지 않는다.
 *
 * public.html이 없으면 '/'로 물러선다 — 함수가 호스팅보다 먼저 배포되는 순간에
 * 빈 화면을 내주지 않기 위한 것이다.
 */
async function fetchHtml(path: string): Promise<string> {
  const r = await fetch(`${HOSTING_URL}${path}`, { signal: AbortSignal.timeout(5000) })
  if (!r.ok) throw new Error(`${path} -> ${r.status}`)
  return r.text()
}

async function loadIndexHtml(): Promise<string> {
  const cached = indexHtmlCache.getFresh()
  if (cached) return cached

  try {
    const html = await fetchHtml('/public.html').catch(() => fetchHtml('/'))
    indexHtmlCache.set(html)
    return html
  } catch {
    const stale = indexHtmlCache.getStale()
    if (stale) return stale
    throw new Error('index html fetch failed')
  }
}

/**
 * 문서에 실을 데이터 태그. 실패하면 빈 문자열을 돌려준다 — 페이지는 스스로
 * fetch할 줄 알기 때문에, 여기서 실패해도 기능이 죽지 않고 예전 속도로만 돌아간다.
 */
async function getInlineDataScript(token: string): Promise<string> {
  if (!token) return ''

  const cached = payloadCache.get(token)
  if (cached && Date.now() - cached.cachedAt < PAYLOAD_CACHE_TTL_MS) return cached.script

  try {
    // 실제 Firestore 타입은 FirestoreLike보다 구조적으로 넓다(admin SDK가 여기서만 등장한다).
    const payload = await buildPublicSchedulePayload(admin.firestore() as unknown as FirestoreLike, token)
    const script = buildInlineDataScript(token, payload)
    payloadCache.set(token, { script, cachedAt: Date.now() })
    return script
  } catch {
    return ''
  }
}

async function getPageTitle(token: string): Promise<string> {
  if (!token) return 'GA Plan 일정'

  const cached = titleCache.get(token)
  if (cached && Date.now() - cached.cachedAt < TITLE_CACHE_TTL_MS) return cached.title

  let title = 'GA Plan 일정'
  const tokensSnap = await admin.firestore().doc('settings/publicTokens').get()
  const scopeValue: string | undefined = tokensSnap.exists ? tokensSnap.data()?.[token] : undefined
  if (scopeValue && scopeValue !== '__all__') {
    const name = getScopeDisplayName(scopeValue)
    if (name) title = `${name} 일정`
  }

  titleCache.set(token, { title, cachedAt: Date.now() })
  return title
}

export const publicScheduleRenderer = onRequest(
  { region: 'asia-northeast3' },
  async (req, res) => {
    const token = req.path.split('/').filter(Boolean).pop() ?? ''

    // 제목과 데이터는 서로를 기다릴 이유가 없다 — 한 번에 띄운다.
    const [title, inlineScript] = await Promise.all([
      token ? getPageTitle(token).catch(() => 'GA Plan 일정') : Promise.resolve('GA Plan 일정'),
      getInlineDataScript(token),
    ])

    const pageUrl = `${HOSTING_URL}/public/schedule/${token}`

    let indexHtml: string
    try {
      indexHtml = await loadIndexHtml()
    } catch {
      // 호스팅에서 문서를 아예 못 받아온 경우. 예전 폴백은 script 태그가 없는 최소
      // HTML이라 사용자에게는 그냥 흰 화면이었다 — 원인을 말해 주는 편이 낫다.
      // no-store로 CDN이 이 실패를 5분간 물고 있지 않게 한다.
      res
        .status(503)
        .set('Cache-Control', 'no-store')
        .set('Content-Type', 'text/html; charset=utf-8')
        .send(
          `<!doctype html><html lang="ko"><head><meta charset="UTF-8"/>` +
          `<title>${escapeAttr(title)}</title></head>` +
          `<body><p>일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p></body></html>`,
        )
      return
    }

    const html = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`)
      .replace(/<meta property="og:title"[^>]*\/?>/, `<meta property="og:title" content="${escapeAttr(title)}" />`)
      .replace(/<meta property="og:url"[^>]*\/?>/, `<meta property="og:url" content="${escapeAttr(pageUrl)}" />`)
      // 데이터는 </head> 앞에 심는다 — 번들이 실행되기 전에 문서에 이미 들어 있어야
      // 페이지가 첫 렌더에서 그걸 씨앗으로 쓸 수 있다.
      .replace('</head>', `${inlineScript}</head>`)

    res.set('Content-Type', 'text/html; charset=utf-8')
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300')
    res.send(html)
  },
)
