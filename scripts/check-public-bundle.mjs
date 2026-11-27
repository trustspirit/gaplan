// 공개 페이지 번들이 다시 커지는 건 import 한 줄이면 일어나고, 아무 테스트도 깨지지
// 않는다. 빌드 뒤 여기서 막는다. vitest로는 빌드 산출물을 볼 수 없어 스크립트다.
import { readFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// 엔트리별 gzip 상한. 공개 일정과 방문 추천 링크는 로그인 앱과 따로 빌드된다(vite.config.ts).
const ENTRIES = [
  // 90 kB였다. 이전 일정 불러오기(2026-11)로 기능 코드만 0.8 kB 늘어 CI 빌드가 90.5 kB가 됐다 —
  // 청크 수(5)는 그대로라 로그인 앱 모듈이 새로 딸려 온 게 아니다. 이 검사가 잡으려는 건
  // 그런 수십 kB짜리 유입이므로 여유를 조금만 더 둔다.
  { html: 'public.html', limit: 95 * 1024 },
  // 추천 화면은 firebase/functions 호출이 필요해 공개 일정보다 크다(2026-11 기준 약 131 kB).
  { html: 'recommend.html', limit: 140 * 1024 },
]

const kb = (n) => `${(n / 1024).toFixed(1)} kB`
let failed = false

for (const { html: name, limit } of ENTRIES) {
  const htmlPath = resolve(root, 'dist', name)
  if (!existsSync(htmlPath)) {
    console.error(`check-public-bundle: dist/${name} 이 없다. 먼저 vite build를 돌릴 것.`)
    process.exit(1)
  }

  const html = readFileSync(htmlPath, 'utf8')
  const assets = [...html.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0])
  if (assets.length === 0) {
    console.error(`check-public-bundle: dist/${name} 이 js를 물고 있지 않다.`)
    process.exit(1)
  }

  let total = 0
  for (const a of assets) {
    total += gzipSync(readFileSync(resolve(root, 'dist', a.slice(1)))).length
  }

  console.log(`check-public-bundle: ${name} ${assets.length} chunk(s), gzip ${kb(total)} / ${kb(limit)}`)

  if (total > limit) {
    failed = true
    console.error(
      `check-public-bundle: ${name} 엔트리가 상한을 넘었다 (${kb(total)} > ${kb(limit)}).\n` +
      '  공개 페이지가 로그인 앱 쪽 모듈을 새로 끌어오지 않았는지 확인할 것 — ' +
      'firebase auth/firestore, react-router, src/i18n/{ko,en}.json 전체가 흔한 범인이다.\n' +
      '  청크 이름은 Rollup이 붙이는 것일 뿐 내용물을 보장하지 않는다 — 예를 들어 ' +
      '"en-*.js"는 실제로는 react-dom 내부 코드다. 이름만 보고 i18n을 의심하지 말고 ' +
      '해당 파일을 직접 열어 확인할 것.',
    )
  }
}

if (failed) process.exit(1)
