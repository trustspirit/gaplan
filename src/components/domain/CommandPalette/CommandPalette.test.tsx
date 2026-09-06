import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { UserRole } from '@/types'

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ko' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

import { CommandPalette } from './CommandPalette'

function open(role: UserRole = 'admin', onClose = vi.fn()) {
  const utils = render(<CommandPalette open onClose={onClose} role={role} />)
  return { ...utils, onClose }
}

const sheet = () => screen.getByRole('dialog')

beforeEach(() => {
  navigateMock.mockClear()
})

describe('CommandPalette', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<CommandPalette open={false} onClose={vi.fn()} role="admin" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('열리면 역할이 볼 수 있는 페이지를 나열한다', () => {
    open('admin')
    expect(screen.getByRole('option', { name: 'nav.home' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'nav.schedules' })).toBeInTheDocument()
  })

  // 권한 판정이 두 곳에 살면 사이드바엔 없는 페이지가 팔레트엔 뜨는 날이 온다.
  it('역할에 없는 페이지는 나오지 않는다', () => {
    open('president')
    const labels = screen.getAllByRole('option').map((o) => o.textContent)
    expect(labels).toContain('nav.home')
    expect(labels).not.toContain('nav.stats')
  })

  it('입력하면 목록이 걸러진다', () => {
    open('admin')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nav.sched' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: 'nav.schedules' })).toBeInTheDocument()
  })

  it('맞는 것이 없으면 빈 안내를 보여준다', () => {
    open('admin')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '없는페이지' } })
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('commandPalette.empty')).toBeInTheDocument()
  })

  it('Enter로 선택한 페이지로 이동하고 닫는다', () => {
    const onClose = vi.fn()
    open('admin', onClose)
    fireEvent.keyDown(sheet(), { key: 'Enter' })

    expect(navigateMock).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalled()
  })

  it('↓로 선택이 내려간다', () => {
    open('admin')
    const before = screen.getAllByRole('option')
    expect(before[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(sheet(), { key: 'ArrowDown' })
    const after = screen.getAllByRole('option')
    expect(after[0]).toHaveAttribute('aria-selected', 'false')
    expect(after[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('↑는 첫 항목에서 마지막으로 돌아간다', () => {
    open('admin')
    fireEvent.keyDown(sheet(), { key: 'ArrowUp' })
    const options = screen.getAllByRole('option')
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true')
  })

  // 결과가 없는데 Enter가 "마지막으로 고른 것"으로 튀면 엉뚱한 페이지로 간다.
  it('결과가 없으면 Enter는 아무것도 하지 않는다', () => {
    open('admin')
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '없는페이지' } })
    fireEvent.keyDown(sheet(), { key: 'Enter' })
    expect(navigateMock).not.toHaveBeenCalled()
  })

  // 목록이 줄어들 때 선택이 목록 밖에 남으면 Enter가 아무 반응도 없어 보인다.
  it('걸러서 목록이 짧아지면 선택이 목록 안으로 돌아온다', () => {
    open('admin')
    fireEvent.keyDown(sheet(), { key: 'ArrowDown' })
    fireEvent.keyDown(sheet(), { key: 'ArrowDown' })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nav.home' } })

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(sheet(), { key: 'Enter' })
    expect(navigateMock).toHaveBeenCalledTimes(1)
  })

  it('항목을 클릭해도 이동하고 닫는다', () => {
    const onClose = vi.fn()
    open('admin', onClose)
    fireEvent.click(screen.getByRole('option', { name: 'nav.schedules' }))

    expect(navigateMock).toHaveBeenCalledWith('/schedules')
    expect(onClose).toHaveBeenCalled()
  })

  it('바깥을 클릭하면 닫힌다', () => {
    const onClose = vi.fn()
    const { container } = render(<CommandPalette open onClose={onClose} role="admin" />)
    const overlay = container.ownerDocument.querySelector('[class*="overlay"]')!
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })
})
