import {
  expectDeclaresInlineSizeContainer,
  expectNoViewportWidthQuery,
  findViewportWidthQueries,
} from './responsiveScope'

describe('findViewportWidthQueries', () => {
  it('finds the mobile/tablet/desktop mixins', () => {
    expect(findViewportWidthQueries('.row { @include mobile { flex-wrap: wrap; } }')).toEqual([
      '@include mobile',
    ])
    expect(findViewportWidthQueries('.row { @include tablet { gap: 0; } }')).toEqual([
      '@include tablet',
    ])
  })

  it('finds a raw width media query', () => {
    expect(findViewportWidthQueries('@media (max-width: 768px) { .row { gap: 0; } }')).toEqual([
      '@media (max-width: 768px)',
    ])
  })

  // 폭이 아닌 질의는 컨테이너로 대체할 수 없다 — 손가락이 포인터인지, 사용자가
  // 움직임을 줄여 달라고 했는지는 조상 상자의 폭과 아무 관계가 없다.
  it('leaves non-width queries alone', () => {
    expect(findViewportWidthQueries('@media (pointer: coarse) { .btn { min-height: 44px; } }')).toEqual([])
    expect(
      findViewportWidthQueries('@media (prefers-reduced-motion: reduce) { .x { transition: none; } }'),
    ).toEqual([])
  })

  it('leaves a container query alone', () => {
    expect(findViewportWidthQueries('@container datalist (max-width: 560px) { .row { gap: 0; } }')).toEqual(
      [],
    )
  })
})

describe('expectNoViewportWidthQuery', () => {
  it('passes on a file that narrows by container', () => {
    expectNoViewportWidthQuery('@container datalist (max-width: 560px) { .row { gap: 0; } }')
  })

  it('rejects a file that narrows by viewport', () => {
    expect(() => expectNoViewportWidthQuery('.row { @include mobile { gap: 0; } }')).toThrow()
  })
})

describe('expectDeclaresInlineSizeContainer', () => {
  it('accepts the container shorthand', () => {
    expectDeclaresInlineSizeContainer('.wrap { container: datalist / inline-size; }')
  })

  it('accepts the longhand pair', () => {
    expectDeclaresInlineSizeContainer(
      '.wrap { container-name: datalist; container-type: inline-size; }',
    )
  })

  it('rejects a file with no container context', () => {
    expect(() => expectDeclaresInlineSizeContainer('.wrap { min-width: 0; }')).toThrow()
  })

  // size 컨테인먼트는 높이까지 가두므로 행 높이가 내용 따라 자라지 못한다.
  it('rejects size containment', () => {
    expect(() =>
      expectDeclaresInlineSizeContainer('.wrap { container: datalist / size; }'),
    ).toThrow()
  })
})
