import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectNoAccentStripe } from './bannedPatterns'

const read = (relative: string) => readFileSync(resolve(__dirname, relative), 'utf8')

describe('expectNoAccentStripe', () => {
  it('passes on the primitives it guards', () => {
    expectNoAccentStripe(read('../Tabs/Tabs.module.scss'))
    expectNoAccentStripe(read('../SegmentedControl/SegmentedControl.module.scss'))
    expectNoAccentStripe(read('../DataList/DataList.module.scss'))
  })

  // 실제 위반 픽스처. TaskCard는 뒤 플랜 소관이라 고치지 않는다 —
  // 여기서는 헬퍼가 진짜 스트라이프를 잡는지 확인하는 레드 케이스로만 쓴다.
  it('rejects the real left stripe in TaskCard', () => {
    expect(() => expectNoAccentStripe(read('../../domain/TaskCard/TaskCard.module.scss'))).toThrow()
  })

  it('rejects a logical-property stripe', () => {
    expect(() =>
      expectNoAccentStripe('.row { border-inline-start: 3px solid $color-primary; }'),
    ).toThrow()
  })

  it('rejects a width-only stripe', () => {
    expect(() => expectNoAccentStripe('.row { border-left-width: 4px; }')).toThrow()
  })

  it('rejects an inset box-shadow stripe', () => {
    expect(() =>
      expectNoAccentStripe('.row { box-shadow: inset 3px 0 0 $color-primary; }'),
    ).toThrow()
  })

  // 왼쪽 스트라이프를 실제로 만드는 가장 흔한 방법
  it('rejects a pseudo-element bar', () => {
    expect(() =>
      expectNoAccentStripe(`.row.active::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 3px;
        background: var(--accent);
      }`),
    ).toThrow()
  })

  it('allows a hairline border and a visually hidden input', () => {
    expectNoAccentStripe('.row { border-left: 1px solid var(--border); }')
    expectNoAccentStripe('.input { position: absolute; width: 1px; height: 1px; opacity: 0; }')
  })

  // 아이콘이나 라벨을 그리는 의사 요소까지 막지는 않는다
  it('allows a pseudo element that is not a thin coloured bar', () => {
    expectNoAccentStripe(`.row::after {
      content: '›';
      width: 24px;
      background: var(--surface);
    }`)
  })
})
