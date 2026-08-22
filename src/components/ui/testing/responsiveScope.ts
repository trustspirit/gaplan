import { expect } from 'vitest'

/**
 * "좁은 자리"를 뷰포트로 판단하지 않았는지 SCSS 원문에서 확인한다.
 *
 * DataList 행은 전체 폭 목록에도 들어가고 일정 화면의 420px 우측 열
 * (ScheduleCalendarPanel의 `.listCol`)에도 들어간다. 미디어 쿼리는 뷰포트만
 * 보므로 데스크톱에서 그 좁은 열에 놓인 행은 "넓다"고 판정돼 줄바꿈·축약이
 * 켜지지 않는다. 그러면 `flex: none`인 meta·tag·badges가 줄어들지 못한 채
 * 상자 밖으로 흘러 형제인 actions 위에 겹쳐 그려진다. 폭 판정은 반드시
 * 컨테이너 쿼리로 한다.
 */

/** 폭을 묻는 뷰포트 질의만 잡는다. `pointer: coarse` 같은 비-폭 질의는 대체 대상이 아니다. */
const VIEWPORT_MIXIN = /@include\s+(mobile|tablet|desktop)\b/gi
const WIDTH_MEDIA = /@media[^{;]*\((?:max|min)-width[^)]*\)/gi

export function findViewportWidthQueries(scssSource: string): string[] {
  return [
    ...Array.from(scssSource.matchAll(VIEWPORT_MIXIN), ([match]) => match.trim()),
    ...Array.from(scssSource.matchAll(WIDTH_MEDIA), ([match]) => match.trim()),
  ]
}

/** 폭 기반 뷰포트 질의가 남아 있지 않은지 확인한다. */
export function expectNoViewportWidthQuery(scssSource: string) {
  const offenses = findViewportWidthQueries(scssSource)
  expect(
    offenses,
    `폭 판정이 뷰포트에 걸려 있다(좁은 열 안에서는 켜지지 않는다): ${offenses.join(' / ')}`,
  ).toEqual([])
}

/**
 * 인라인 축 컨테인먼트를 선언했는지 확인한다. `size`는 높이까지 가둬 행이
 * 내용만큼 자라지 못하므로 받지 않는다.
 */
export function expectDeclaresInlineSizeContainer(scssSource: string) {
  const shorthand = /container\s*:\s*[^;}]*\binline-size\b/i.test(scssSource)
  const longhand = /container-type\s*:\s*inline-size/i.test(scssSource)
  expect(
    shorthand || longhand,
    '컨테이너 컨텍스트(container-type: inline-size)를 선언하지 않았다 — @container가 조상을 못 찾는다',
  ).toBe(true)
}
