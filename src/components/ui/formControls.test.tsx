import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Input, Select, Textarea } from './index'

function readUiStyles(component: string) {
  return readFileSync(resolve(__dirname, component, `${component}.module.scss`), 'utf8')
}

const mixins = readFileSync(resolve(__dirname, '../../styles/_mixins.scss'), 'utf8')
const variables = readFileSync(resolve(__dirname, '../../styles/_variables.scss'), 'utf8')

// control-metrics 믹스인의 @include mobile 블록 본문
function mobileBlockOfControlMetrics() {
  const mixin = mixins.slice(mixins.indexOf('@mixin control-metrics'))
  const mobileStart = mixin.indexOf('@include mobile')
  expect(mobileStart).toBeGreaterThan(-1)
  const open = mixin.indexOf('{', mobileStart)
  let depth = 0
  for (let i = open; i < mixin.length; i++) {
    if (mixin[i] === '{') depth++
    if (mixin[i] === '}') {
      depth--
      if (depth === 0) return mixin.slice(open + 1, i)
    }
  }
  throw new Error('control-metrics의 mobile 블록을 닫는 괄호를 찾지 못했다')
}

describe('form controls', () => {
  it('Textarea matches the shared label and error API', () => {
    render(<Textarea label="설명" error="필수입니다" value="" onChange={() => {}} />)

    expect(screen.getByLabelText('설명')).toBeInstanceOf(HTMLTextAreaElement)
    expect(screen.getByText('필수입니다')).toBeInTheDocument()
    expect(screen.getByLabelText('설명')).toHaveAccessibleDescription('필수입니다')
  })

  it('Input and Select render the date/time and dropdown controls', () => {
    render(
      <>
        <Input label="날짜" type="date" />
        <Select label="종류" options={[{ value: 'conference', label: '대회' }]} />
      </>,
    )

    expect(screen.getByLabelText('날짜')).toBeInstanceOf(HTMLInputElement)
    expect(screen.getByLabelText('종류')).toBeInstanceOf(HTMLSelectElement)
  })

  // 세 컨트롤이 각자 높이·패딩을 적어 두면 모바일 조정을 세 번 해야 하고, 한 곳을
  // 빠뜨리면 같은 폼 안에서 컨트롤 높이가 어긋난다.
  it('Input·Select·Textarea가 공용 control-metrics 믹스인으로 높이·패딩을 받는다', () => {
    for (const component of ['Input', 'Select', 'Textarea']) {
      const css = readUiStyles(component)
      expect(css, component).toContain('@include control-metrics')
      expect(css, component).not.toMatch(/min-height:\s*44px/)
    }
  })

  it('control-metrics가 데스크톱 44px 최소 높이를 토큰으로 정한다', () => {
    expect(variables).toMatch(/\$control-min-height:\s*44px/)
    expect(mixins).toMatch(/@mixin control-metrics/)
    expect(mixins).toContain('min-height: $control-min-height')
  })

  it('모바일에서는 높이와 패딩을 줄인다', () => {
    expect(variables).toMatch(/\$control-min-height-mobile:\s*(\d+)px/)
    const mobileHeight = Number(
      /\$control-min-height-mobile:\s*(\d+)px/.exec(variables)![1],
    )
    expect(mobileHeight).toBeLessThan(44)

    const mobileBlock = mobileBlockOfControlMetrics()
    expect(mobileBlock).toContain('min-height: $control-min-height-mobile')
    expect(mobileBlock).toContain('padding:')
  })

  // 모바일 폰트를 16px 아래로 줄이면 iOS Safari가 포커스할 때 화면을 확대한다.
  it('모바일에서 폰트 크기는 건드리지 않는다', () => {
    expect(mobileBlockOfControlMetrics()).not.toContain('font-size')
    for (const component of ['Input', 'Select', 'Textarea']) {
      expect(readUiStyles(component), component).toContain('font-size: $font-size-base')
    }
  })

  it('supports wrapperClassName for compact inline layouts', () => {
    const { container } = render(
      <>
        <Input label="시작" wrapperClassName="inlineField" />
        <Select label="종류" wrapperClassName="inlineSelect" options={[]} />
        <Textarea label="메모" wrapperClassName="inlineTextarea" />
      </>,
    )

    expect(container.querySelector('.inlineField')).toBeInTheDocument()
    expect(container.querySelector('.inlineSelect')).toBeInTheDocument()
    expect(container.querySelector('.inlineTextarea')).toBeInTheDocument()
  })

  it('associates hint text with the control', () => {
    render(<Input label="줌 링크" hint="비워두면 자동 생성됩니다" />)
    const input = screen.getByLabelText('줌 링크')
    expect(input).toHaveAccessibleDescription('비워두면 자동 생성됩니다')
  })

  it('describes the control with both hint and error', () => {
    render(
      <Input label="줌 링크" hint="비워두면 자동 생성됩니다" error="형식이 올바르지 않습니다" />,
    )
    const input = screen.getByLabelText('줌 링크')
    expect(input).toHaveAccessibleDescription('비워두면 자동 생성됩니다 형식이 올바르지 않습니다')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('supports hint on Select and Textarea too', () => {
    render(
      <>
        <Select label="지역" options={[]} hint="담당 지역만 보입니다" />
        <Textarea label="메모" hint="회장이 함께 봅니다" />
      </>,
    )
    expect(screen.getByLabelText('지역')).toHaveAccessibleDescription('담당 지역만 보입니다')
    expect(screen.getByLabelText('메모')).toHaveAccessibleDescription('회장이 함께 봅니다')
  })
})
