import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Input, Select, Textarea } from './index'

function readUiStyles(component: string) {
  return readFileSync(
    resolve(__dirname, component, `${component}.module.scss`),
    'utf8',
  )
}

describe('form controls', () => {
  it('Textarea matches the shared label and error API', () => {
    render(<Textarea label="설명" error="필수입니다" value="" onChange={() => {}} />)

    expect(screen.getByLabelText('설명')).toBeInstanceOf(HTMLTextAreaElement)
    expect(screen.getByText('필수입니다')).toBeInTheDocument()
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
})
