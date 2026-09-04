import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import koPublic from './public/ko.json'
import enPublic from './public/en.json'
import ko from './ko.json'
import en from './en.json'

// refresh/retry/presidentAccompanied는 common.*/schedule.*에도 같은 문구가 있다.
// 공개 엔트리가 그 키들을 그대로 참조하면 본 앱 사전 전체(gzip 30.6 kB)가 딸려
// 오므로, public.* 아래로 일부러 복제해 두었다 — 문구 3개를 두 곳에 두는 대신
// 방문자 전원에게 ~30kB를 더 보내지 않기 위한 트레이드오프다. "중복이니 하나로
// 합치자"는 리팩터는 이 분리를 되돌리는 것이니 하지 않는다.

// Vite/Vitest는 `new URL('...', import.meta.url)` 리터럴 구문을 애셋 번들링용으로
// 특수 처리해 개발 서버 URL(http://localhost:3000/...)로 바꿔치기한다 — 실제
// 파일을 읽으려는 의도와 충돌하므로, import.meta.url을 먼저 경로 문자열로 변환한
// 뒤 path로 조합해 그 변환을 우회한다.
const HERE = fileURLToPath(import.meta.url)
const PAGE_PATH = path.resolve(path.dirname(HERE), '../pages/public/PublicSchedulePage.tsx')
const PAGE = readFileSync(PAGE_PATH, 'utf8')

// PublicSchedulePage.tsx가 실제로 부르는 키를 파일에서 직접 스캔한다. 사람이
// 유지보수하는 목록은 페이지가 바뀌어도 갱신을 잊을 수 있어 가드가 되지 못한다 —
// 스캔이라야 새 t('common.*')이 추가되는 순간 이 테스트가 잡아낸다.
const usedKeys = [...new Set([...PAGE.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]))].sort()

function get(dict: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], dict)
}

describe('공개 사전', () => {
  it('ko와 en의 키 집합이 같다', () => {
    expect(Object.keys(koPublic.public).sort()).toEqual(Object.keys(enPublic.public).sort())
  })

  it('스캔이 키를 하나라도 찾아낸다', () => {
    // 정규식이 더 이상 매치하지 않게 되면 아래 검사들이 전부 공허하게 통과해
    // 버린다 — 그 상태를 여기서 먼저 잡는다.
    expect(usedKeys.length).toBeGreaterThan(0)
  })

  it('페이지의 모든 t() 호출은 문자열 리터럴 키만 쓴다', () => {
    // 계산된 키(t(someVar))는 스캔을 통과해 버려 가드가 무력해진다.
    expect([...PAGE.matchAll(/\bt\(\s*[^'"\s)]/g)]).toHaveLength(0)
  })

  it.each(usedKeys)('%s 는 public.* 네임스페이스에 있다', (key) => {
    // public.* 밖의 키를 페이지가 참조하면 그 순간 공개 엔트리가 본 앱 사전
    // 전체(gzip 30.6 kB)를 끌어오게 되어 이 태스크의 분리가 조용히 무효화된다.
    expect(key.startsWith('public.')).toBe(true)
  })

  it.each(usedKeys)('%s 가 ko/en 양쪽에 있다', (path) => {
    expect(get(koPublic as never, path)).toBeTruthy()
    expect(get(enPublic as never, path)).toBeTruthy()
  })

  // 공개 엔트리가 본 앱 사전을 조금이라도 참조하면 그 순간 전체(gzip 30.6 kB)가
  // 딸려 온다. public.*는 본 앱 사전에서 빠져 있어야 한다.
  it('본 앱 사전에는 public 최상위 키가 없다', () => {
    expect('public' in ko).toBe(false)
    expect('public' in en).toBe(false)
  })
})
