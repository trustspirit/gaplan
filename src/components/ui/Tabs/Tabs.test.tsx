import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectNoAccentStripe } from '../testing/bannedPatterns'
import { Tabs, type TabLinkProps, type TabItem } from './Tabs'

const ITEMS = [
  { id: 'plans', label: '방문 계획' },
  { id: 'tasks', label: 'Task', count: 3 },
  { id: 'projects', label: '프로젝트' },
]

const LINK_ITEMS: TabItem[] = [
  { id: 'visits', label: '방문', href: '/schedules/visits' },
  { id: 'tasks', label: '태스크', href: '/schedules/tasks' },
]

describe('Tabs', () => {
  it('renders a tablist with one tab per item', () => {
    render(<Tabs items={ITEMS} activeId="plans" onSelect={() => {}} aria-label="계획 탭" />)
    expect(screen.getByRole('tablist', { name: '계획 탭' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('marks the active tab as selected', () => {
    render(<Tabs items={ITEMS} activeId="tasks" onSelect={() => {}} aria-label="계획 탭" />)
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Task')
  })

  it('reports the selected id', async () => {
    const onSelect = vi.fn()
    render(<Tabs items={ITEMS} activeId="plans" onSelect={onSelect} aria-label="계획 탭" />)
    await userEvent.click(screen.getByRole('tab', { name: /프로젝트/ }))
    expect(onSelect).toHaveBeenCalledWith('projects')
  })

  it('shows the count next to the label', () => {
    render(<Tabs items={ITEMS} activeId="plans" onSelect={() => {}} aria-label="계획 탭" />)
    expect(screen.getByRole('tab', { name: 'Task 3' })).toBeInTheDocument()
  })

  it('keeps only the active tab in the tab order', () => {
    render(<Tabs items={ITEMS} activeId="tasks" onSelect={() => {}} aria-label="계획 탭" />)
    expect(screen.getByRole('tab', { name: /Task/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: '방문 계획' })).toHaveAttribute('tabindex', '-1')
  })

  // 로빙 tabindex는 짝이다 — 비활성 탭을 탭 순서에서 빼면 화살표 키로 되돌려줘야 한다
  it('moves focus to the next tab with ArrowRight, wrapping past the last', async () => {
    const onSelect = vi.fn()
    render(<Tabs items={ITEMS} activeId="plans" onSelect={onSelect} aria-label="계획 탭" />)
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(tabs[2]).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(tabs[0]).toHaveFocus()

    // 수동 활성화 탭리스트 — 포커스 이동만 하고 선택은 바꾸지 않는다
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('moves focus to the previous tab with ArrowLeft, wrapping past the first', async () => {
    render(<Tabs items={ITEMS} activeId="plans" onSelect={() => {}} aria-label="계획 탭" />)
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()

    await userEvent.keyboard('{ArrowLeft}')
    expect(tabs[2]).toHaveFocus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(tabs[1]).toHaveFocus()
  })

  it('jumps to the first and last tab with Home and End', async () => {
    render(<Tabs items={ITEMS} activeId="plans" onSelect={() => {}} aria-label="계획 탭" />)
    const tabs = screen.getAllByRole('tab')
    tabs[1].focus()

    await userEvent.keyboard('{End}')
    expect(tabs[2]).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(tabs[0]).toHaveFocus()
  })

  // activeId가 어떤 항목과도 맞지 않으면 모든 탭이 tabIndex=-1이 되어
  // 탭리스트 전체가 키보드로 도달 불가능해진다
  it('keeps the first tab tabbable when no item matches activeId', () => {
    render(<Tabs items={ITEMS} activeId="없는-탭" onSelect={() => {}} aria-label="계획 탭" />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('tabindex', '0')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')
    expect(tabs[2]).toHaveAttribute('tabindex', '-1')
  })

  it('uses renderLink for items that have an href, passing a distinct className', () => {
    const classNames: string[] = []
    render(
      <Tabs
        items={LINK_ITEMS}
        activeId="visits"
        renderLink={(item, children, props) => {
          classNames.push(props.className)
          return (
            <a href={item.href} {...props}>
              {children}
            </a>
          )
        }}
        aria-label="일정 탭"
      />,
    )
    expect(screen.getByRole('tab', { name: '방문' })).toHaveAttribute('href', '/schedules/visits')
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('방문')
    expect(screen.getByRole('tab', { name: '태스크' })).toHaveAttribute('aria-selected', 'false')
    expect(classNames[0]).not.toEqual(classNames[1])
  })

  // renderLink는 role/aria-selected/tabIndex/onKeyDown을 전부 담은 프롭 백을 받는다 —
  // 호출자가 ARIA 속성 하나를 빠뜨릴 여지를 없앤다
  it('hands renderLink a props bag whose tabIndex and aria-selected differ per item', () => {
    const bags: TabLinkProps[] = []
    render(
      <Tabs
        items={LINK_ITEMS}
        activeId="visits"
        renderLink={(item, children, props) => {
          bags.push(props)
          return (
            <a href={item.href} {...props}>
              {children}
            </a>
          )
        }}
        aria-label="일정 탭"
      />,
    )
    expect(bags).toHaveLength(2)
    expect(bags[0].role).toBe('tab')
    expect(bags[1].role).toBe('tab')
    expect(bags[0]['aria-selected']).toBe(true)
    expect(bags[1]['aria-selected']).toBe(false)
    expect(bags[0].tabIndex).toBe(0)
    expect(bags[1].tabIndex).toBe(-1)
    expect(typeof bags[0].onKeyDown).toBe('function')
  })

  it('moves focus with arrow keys through the renderLink path too', async () => {
    render(
      <Tabs
        items={LINK_ITEMS}
        activeId="visits"
        renderLink={(item, children, props) => (
          <a href={item.href} {...props}>
            {children}
          </a>
        )}
        aria-label="일정 탭"
      />,
    )
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(tabs[0]).toHaveFocus()
  })

  // 활성 표시는 밑줄과 글자 무게로. 왼쪽 스트라이프 금지 (스펙 §3)
  it('never uses a left accent stripe', () => {
    const scss = readFileSync(resolve(__dirname, 'Tabs.module.scss'), 'utf8')
    expectNoAccentStripe(scss)
  })
})
