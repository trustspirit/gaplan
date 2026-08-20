import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Input, Select, Textarea } from './index'

function readUiStyles(component: string) {
  return readFileSync(resolve(__dirname, component, `${component}.module.scss`), 'utf8')
}

describe('form controls', () => {
  it('Textarea matches the shared label and error API', () => {
    render(<Textarea label="설명" error="필수입니다" value="" onChange={() => {}} />)

    expect(screen.getByLabelText('설명')).toBeInstanceOf(HTMLTextAreaElement)
    expect(screen.getByText('필수입니다')).toBeInTheDocument()
    expect(screen.getByLabelText('설명')).toHaveAccessibleDescription('필수입니다')
  })

  it('Input and Select keep date/time controls at mobile-friendly touch height', () => {
    render(
      <>
        <Input label="날짜" type="date" />
        <Select label="종류" options={[{ value: 'conference', label: '대회' }]} />
      </>,
    )

    expect(screen.getByLabelText('날짜')).toBeInstanceOf(HTMLInputElement)
    expect(screen.getByLabelText('종류')).toBeInstanceOf(HTMLSelectElement)
    expect(readUiStyles('Input')).toMatch(/min-height:\s*44px/)
    expect(readUiStyles('Select')).toMatch(/min-height:\s*44px/)
  })

  it('Textarea uses the same minimum touch height contract', () => {
    expect(readUiStyles('Textarea')).toMatch(/min-height:\s*44px/)
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
