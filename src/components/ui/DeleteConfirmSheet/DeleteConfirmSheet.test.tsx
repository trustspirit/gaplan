// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteConfirmSheet } from './DeleteConfirmSheet'

// useIsMobile을 모킹해서 브랜치를 결정론적으로 테스트
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))

describe('DeleteConfirmSheet', () => {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()

  beforeEach(() => {
    onConfirm.mockClear()
    onCancel.mockClear()
  })

  it('open=false 이면 아무것도 렌더하지 않는다', () => {
    render(
      <DeleteConfirmSheet open={false} onConfirm={onConfirm} onCancel={onCancel} />
    )
    expect(screen.queryByText('삭제하시겠어요?')).toBeNull()
  })

  it('open=true 이면 제목과 버튼이 보인다', () => {
    render(
      <DeleteConfirmSheet open onConfirm={onConfirm} onCancel={onCancel} />
    )
    expect(screen.getByText('삭제하시겠어요?')).toBeDefined()
    expect(screen.getByText('취소')).toBeDefined()
    expect(screen.getByText('삭제')).toBeDefined()
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
    fireEvent.click(screen.getByText('삭제'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('취소 버튼 클릭 시 onCancel이 호출된다', () => {
    render(
      <DeleteConfirmSheet open onConfirm={onConfirm} onCancel={onCancel} />
    )
    fireEvent.click(screen.getByText('취소'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
