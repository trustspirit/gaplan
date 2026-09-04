// 공개 페이지 번들이 다시 커지는 건 import 한 줄이면 일어나고, 아무 테스트도 깨지지
// 않는다. 빌드 뒤 여기서 막는다. vitest로는 빌드 산출물을 볼 수 없어 스크립트다.
import { readFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LIMIT_BYTES = 90 * 1024

const htmlPath = resolve(root, 'dist/public.html')
if (!existsSync(htmlPath)) {
  console.error('check-public-bundle: dist/public.html 이 없다. 먼저 vite build를 돌릴 것.')
  process.exit(1)
}

const html = readFileSync(htmlPath, 'utf8')
const assets = [...html.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0])
if (assets.length === 0) {
  console.error('check-public-bundle: dist/public.html 이 js를 물고 있지 않다.')
  process.exit(1)
}

let total = 0
for (const a of assets) {
  total += gzipSync(readFileSync(resolve(root, 'dist', a.slice(1)))).length
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`
console.log(`check-public-bundle: ${assets.length} chunk(s), gzip ${kb(total)} / ${kb(LIMIT_BYTES)}`)

if (total > LIMIT_BYTES) {
  console.error(
    `check-public-bundle: 공개 엔트리가 상한을 넘었다 (${kb(total)} > ${kb(LIMIT_BYTES)}).\n` +
    '  공개 페이지가 로그인 앱 쪽 모듈을 새로 끌어오지 않았는지 확인할 것 — ' +
    'firebase auth/firestore, react-router, src/i18n/{ko,en}.json 이 흔한 범인이다.\n' +
    '  청크 이름은 Rollup이 붙이는 것일 뿐 내용물을 보장하지 않는다 — 예를 들어 ' +
    '"en-*.js"는 실제로는 react-dom 내부 코드다. 이름만 보고 i18n을 의심하지 말고 ' +
    '해당 파일을 직접 열어 확인할 것.',
  )
  process.exit(1)
}
