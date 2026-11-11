// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteConfirmSheet } from './DeleteConfirmSheet'

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: vi.fn() }))
// 문구는 번역 키에서 온다 — 여기서는 키가 그대로 나오게 해 어떤 키를 쓰는지 고정한다.
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

import { useIsMobile } from '@/hooks/useIsMobile'
const mockUseIsMobile = useIsMobile as ReturnType<typeof vi.fn>

describe('DeleteConfirmSheet (desktop)', () => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()

  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false)
    onConfirm.mockClear()
    onCancel.mockClear()
  })

  it('open=false 이면 아무것도 렌더하지 않는다', () => {
    render(
      <DeleteConfirmSheet open={false} onConfirm={onConfirm} onCancel={onCancel} />
    )
    expect(screen.queryByText('confirm.deleteTitle')).toBeNull()
  })

  it('open=true 이면 제목과 버튼이 보인다', () => {
    render(
      <DeleteConfirmSheet open onConfirm={onConfirm} onCancel={onCancel} />
    )
    expect(screen.getByText('confirm.deleteTitle')).toBeDefined()
    expect(screen.getByText('common.cancel')).toBeDefined()
    expect(screen.getByText('common.delete')).toBeDefined()
  })

  it('description이 있으면 표시된다', () => {
    render(
      <DeleteConfirmSheet open description="구역 방문 · 3동 1구역" onConfirm={onConfirm} onCancel={onCancel} />
    )
    expect(screen.getByText('구역 방문 · 3동 1구역')).toBeDefined()
  })

  it('삭제 버튼 클릭 시 onConfirm이 호출된다', () => {
    render(
      <DeleteConfirmSheet open onConfirm={onConfirm} onCancel={onCancel} />
    )
    fireEvent.click(screen.getByText('common.delete'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    render(
      <DeleteConfirmSheet open onConfirm={onConfirm} onCancel={onCancel} />
    )
    fireEvent.click(screen.getByText('common.cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('DeleteConfirmSheet (mobile)', () => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()

  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(true)
    onConfirm.mockClear()
    onCancel.mockClear()
  })

  it('모바일에서 open=true 이면 BottomSheet가 마운트된다', () => {
    render(
      <DeleteConfirmSheet open onConfirm={onConfirm} onCancel={onCancel} />
    )
    // BottomSheet는 open=false여도 DOM에 남아있지만 open=true이면 제목이 보임
    expect(screen.getByText('confirm.deleteTitle')).toBeDefined()
  })

  it('모바일에서 삭제 버튼 클릭 시 onConfirm이 호출된다', () => {
    render(
      <DeleteConfirmSheet open onConfirm={onConfirm} onCancel={onCancel} />
    )
    fireEvent.click(screen.getByText('common.delete'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
