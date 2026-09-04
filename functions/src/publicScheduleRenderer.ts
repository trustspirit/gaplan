import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { getScopeDisplayName } from './regions'
import { createTtlCache } from './publicScheduleRendererCache'
import { buildPublicSchedulePayload, PublicScopeError, type FirestoreLike } from './publicSchedulePayload'
import { buildInlineDataScript } from './publicInlineScript'

const HOSTING_URL = 'https://gaplan-fccfe.web.app'
const HTML_CACHE_TTL_MS = 5 * 60 * 1000
const TITLE_CACHE_TTL_MS = 5 * 60 * 1000

const indexHtmlCache = createTtlCache<string>(HTML_CACHE_TTL_MS)
const titleCache = new Map<string, { title: string; cachedAt: number }>()

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
    // 호스팅의 catch-all rewrite("**" -> /index.html)는 public.html이 실제로 없어도
    // 200을 돌려준다 — r.ok만으로는 올바른 문서(공개 전용 엔트리)가 왔다고 증명되지
    // 않으므로, 심어둔 마커로 직접 확인한다. 실패해도 던지지 않는다: 결국 같은
    // index.html이라 더 나은 대안이 없다.
    if (!html.includes('name="gaplan-entry"')) {
      console.warn('public.html이 호스팅에 없어(또는 catch-all에 걸려) 로그인 엔트리(index.html)를 대신 서빙합니다.')
    }
    indexHtmlCache.set(html)
    return html
  } catch {
    const stale = indexHtmlCache.getStale()
    if (stale) return stale
    throw new Error('index html fetch failed')
  }
}

/**
 * 문서에 실을 데이터 태그. 캐시하지 않는다 — 캐시하면 관리자가 링크를 비공개로 돌린 뒤에도
 * 그 시간만큼 예전 일정이 문서 소스에 그대로 남는다. CDN(s-maxage=300)이 부하를 흡수하고
 * 그 창은 이 설계가 처음부터 받아들인 것이지만, 인스턴스 캐시를 더하면 최악의 경우가 두 배가
 * 되는데 그건 계산에 넣은 적이 없다. 읽기 비용은 이 변경 전 클라이언트가 매 페이지 로드마다
 * 콜러블로 하던 것과 같다 — 회귀가 아니다.
 *
 * 실패하면 빈 문자열을 돌려준다. 페이지는 스스로 fetch할 줄 알기 때문에 기능이 죽지는 않고
 * 예전 속도로 돌아갈 뿐이다 — 그래서 더더욱 로그가 필요하다. 조용히 삼키면 왕복 절감이 통째로
 * 사라진 걸 아무도 모른다.
 */
async function getInlineDataScript(token: string): Promise<string> {
  if (!token) return ''

  try {
    // 실제 Firestore 타입은 FirestoreLike보다 구조적으로 넓다(admin SDK가 여기서만 등장한다).
    const payload = await buildPublicSchedulePayload(admin.firestore() as unknown as FirestoreLike, token)
    const script = buildInlineDataScript(token, payload)
    if (!script) {
      // 캡을 넘겨 안 실은 경우. 가장 큰 스코프가 인라인의 이득이 가장 큰 자리라 조용히 넘기면 안 된다.
      console.warn('[publicScheduleRenderer] inline payload exceeded the size cap; serving without it')
    }
    return script
  } catch (e) {
    // PublicScopeError(잘못됐거나 꺼진 토큰)는 정상 흐름이다 — 페이지가 스스로 fetch해서
    // 비공개 화면을 띄운다. 그 밖의 에러는 반드시 남긴다: FirestoreLike가 실제 SDK와 어긋나는
    // 경우가 정확히 여기로 떨어지는데, 이 저장소는 functions/src를 타입 검사하지 않는다.
    if (!(e instanceof PublicScopeError)) {
      console.error('[publicScheduleRenderer] failed to build the inline payload', e)
    }
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

    // 문자열 리플레이서는 $&, $`, $', $$를 치환 문자열 안에서 특수 패턴으로 해석한다.
    // inlineScript는 notes/customTitle/wardName 같은 사용자 입력을 담고 있어 그 패턴이
    // 그대로 등장할 수 있다 — 함수 리플레이서로 넘기면 그 해석이 통째로 꺼진다. title/
    // pageUrl은 오늘은 안전하지만, 같은 위험을 한 리팩터링 거리에 두지 않기 위해 체인
    // 전체를 함수 리플레이서로 통일한다.
    const html = indexHtml
      // escapeAttr은 &, "만 이스케이프한다 — <title> 안에서 실제로 위험한 문자는 '<'인데,
      // 이게 안전한 건 title이 getScopeDisplayName의 고정 지역 표(regions.ts)에서만 나오고
      // 사용자 입력을 절대 타지 않기 때문이다. 나중에 title이 사용자 입력(예: customTitle)을
      // 반영하게 되면 여기도 '<'를 이스케이프해야 한다.
      .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeAttr(title)}</title>`)
      .replace(/<meta property="og:title"[^>]*\/?>/, () => `<meta property="og:title" content="${escapeAttr(title)}" />`)
      .replace(/<meta property="og:url"[^>]*\/?>/, () => `<meta property="og:url" content="${escapeAttr(pageUrl)}" />`)
      // 데이터는 </head> 앞에 심는다 — 번들이 실행되기 전에 문서에 이미 들어 있어야
      // 페이지가 첫 렌더에서 그걸 씨앗으로 쓸 수 있다.
      .replace('</head>', () => `${inlineScript}</head>`)

    res.set('Content-Type', 'text/html; charset=utf-8')
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300')
    res.send(html)
  },
)
