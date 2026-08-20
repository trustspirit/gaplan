import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { value: 'mine', label: '내 담당' },
  { value: 'all', label: '전체' },
]

describe('SegmentedControl', () => {
  it('renders a radiogroup with the given label', () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="mine"
        onChange={() => {}}
        aria-label="보기 범위"
      />,
    )
    expect(screen.getByRole('radiogroup', { name: '보기 범위' })).toBeInTheDocument()
  })

  it('marks only the current value as selected', () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="mine"
        onChange={() => {}}
        aria-label="보기 범위"
      />,
    )
    expect(screen.getByRole('radio', { name: '내 담당' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '전체' })).not.toBeChecked()
  })

  it('reports the clicked value', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        options={OPTIONS}
        value="mine"
        onChange={onChange}
        aria-label="보기 범위"
      />,
    )
    await userEvent.click(screen.getByRole('radio', { name: '전체' }))
    expect(onChange).toHaveBeenCalledWith('all')
  })

  // 화살표 키 이동은 브라우저가 같은 name의 라디오 그룹에 대해 공짜로 준다.
  // jsdom에서 키 이동 자체를 흉내내기보다, 그 동작이 나오는 조건을 검사한다.
  it('puts every option in one radio group so arrow keys work', () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="mine"
        onChange={() => {}}
        aria-label="보기 범위"
      />,
    )
    const [first, second] = screen.getAllByRole('radio')
    expect(first).toHaveAttribute('name')
    expect(first.getAttribute('name')).toBe(second.getAttribute('name'))
  })

  // 활성 표시는 배경 채움 + 글자 무게로만 한다 (스펙 §3)
  it('never uses a left accent stripe for the active segment', () => {
    const scss = readFileSync(resolve(__dirname, 'SegmentedControl.module.scss'), 'utf8')
    expect(scss).not.toMatch(/border-left:\s*[2-9]/)
    expect(scss).not.toMatch(/box-shadow:\s*inset\s+[2-9]/)
  })
})
