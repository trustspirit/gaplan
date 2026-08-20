import { expect } from 'vitest'

/**
 * 스펙 §3이 금지한 "왼쪽 액센트 스트라이프 / 행 앞의 색 바"를 SCSS 원문에서 찾는다.
 * SegmentedControl · Tabs · DataList 테스트에 세 번 복사돼 있던 검사를 한 곳으로 모으고,
 * 원래 정규식이 놓치던 세 가지를 추가로 잡는다:
 *   - border-inline-start (논리 속성)
 *   - border-left-width (폭만 따로 지정)
 *   - ::before / ::after 로 만든 얇은 색 바 (실제로 스트라이프를 만드는 가장 흔한 방법)
 */

/** 2px 이상이면 장식용 스트라이프로 본다. 1px 헤어라인 구분선은 허용. */
const STRIPE_MIN_PX = 2
/** 의사 요소가 이 폭 이하이면서 배경색을 가지면 색 바로 본다. */
const BAR_MAX_PX = 8

const LENGTH = /(-?\d*\.?\d+)\s*(px|rem|em)/gi

/** 값에 들어 있는 길이들을 px로 환산해 돌려준다. 변수(`$x`)는 알 수 없으므로 무시한다. */
function lengthsInPx(value: string): number[] {
  return Array.from(value.matchAll(LENGTH), ([, n, unit]) => {
    const num = Number(n)
    return unit.toLowerCase() === 'px' ? num : num * 16
  })
}

function findLeftBorders(scss: string): string[] {
  const decl = /border-(?:left|inline-start)(?:-width)?\s*:\s*([^;{}]+)/gi
  return Array.from(scss.matchAll(decl))
    .filter(([, value]) => lengthsInPx(value).some((px) => px >= STRIPE_MIN_PX))
    .map(([match]) => match.trim())
}

function findInsetShadows(scss: string): string[] {
  return Array.from(scss.matchAll(/box-shadow\s*:\s*([^;{}]+)/gi))
    .filter(
      ([, value]) =>
        /\binset\b/i.test(value) && lengthsInPx(value).some((px) => px >= STRIPE_MIN_PX),
    )
    .map(([match]) => match.trim())
}

function findPseudoBars(scss: string): string[] {
  // 중첩 블록이 없는 단순한 의사 요소 블록만 본다 — 스트라이프는 항상 이 모양이다
  const block = /(&?\s*::?(?:before|after)[^{}]*)\{([^{}]*)\}/gi
  return Array.from(scss.matchAll(block))
    .filter(([, , body]) => {
      const hasBackground = /background(?:-color|-image)?\s*:/i.test(body)
      const width = /(?:^|[;{\s])width\s*:\s*([^;{}]+)/i.exec(body)
      if (!hasBackground || !width) return false
      const px = lengthsInPx(width[1])
      return px.length > 0 && px.every((value) => value > 0 && value <= BAR_MAX_PX)
    })
    .map(([, selector]) => selector.trim())
}

function findAccentStripes(scssSource: string): string[] {
  return [
    ...findLeftBorders(scssSource),
    ...findInsetShadows(scssSource),
    ...findPseudoBars(scssSource).map((selector) => `${selector} { 얇은 색 바 }`),
  ]
}

/** 활성/선택 표시에 왼쪽 색 스트라이프를 쓰지 않았는지 확인한다. */
export function expectNoAccentStripe(scssSource: string) {
  const offenses = findAccentStripes(scssSource)
  expect(offenses, `금지된 왼쪽 액센트 스트라이프를 찾았다: ${offenses.join(' / ')}`).toEqual([])
}
