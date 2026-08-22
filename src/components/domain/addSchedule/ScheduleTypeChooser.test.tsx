import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'ko' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
vi.mock('react-dom', () => ({
  createPortal: (node: React.ReactNode) => node,
}))

import { ScheduleTypeChooser } from './ScheduleTypeChooser'

describe('ScheduleTypeChooser', () => {
  it('admin에게 카드 4개를 렌더한다', () => {
    render(
      <ScheduleTypeChooser
        choices={['ward_visit', 'interview', 'meeting', 'general_schedule']}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /schedule.type.ward_visit/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /schedule.type.interview/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /schedule.type.meeting/ })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /schedule.addChoice.general_schedule.label/ }),
    ).toBeInTheDocument()
  })

  it('칠십인에게는 행사 카드 하나만 렌더한다', () => {
    render(<ScheduleTypeChooser choices={['general_schedule']} onPick={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /schedule.type.ward_visit/ })).toBeNull()
    expect(
      screen.getByRole('button', { name: /schedule.addChoice.general_schedule.label/ }),
    ).toBeInTheDocument()
  })

  it('카드를 클릭하면 그 종류로 onPick을 부른다', async () => {
    const onPick = vi.fn()
    render(
      <ScheduleTypeChooser
        choices={['ward_visit', 'interview', 'meeting', 'general_schedule']}
        onPick={onPick}
        onClose={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /schedule.type.interview/ }))
    expect(onPick).toHaveBeenCalledWith('interview')
  })

  // 카드는 실제 button이어야 Tab으로 순회되고 Enter로 선택된다 — 이 테스트는
  // userEvent.keyboard로 진짜 브라우저의 button 활성화 동작(Enter → click)을 탄다.
  it('카드에 포커스를 두고 Enter를 누르면 선택된다', async () => {
    const onPick = vi.fn()
    render(
      <ScheduleTypeChooser choices={['ward_visit', 'meeting']} onPick={onPick} onClose={vi.fn()} />,
    )
    const card = screen.getByRole('button', { name: /schedule.type.meeting/ })
    card.focus()
    await userEvent.keyboard('{Enter}')
    expect(onPick).toHaveBeenCalledWith('meeting')
  })

  it('오버레이를 클릭하면 확인 없이 바로 닫힌다', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <ScheduleTypeChooser choices={['ward_visit']} onPick={vi.fn()} onClose={onClose} />,
    )
    const overlay = container.firstElementChild as HTMLElement
    await userEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape를 누르면 확인 없이 바로 닫힌다', async () => {
    const onClose = vi.fn()
    render(<ScheduleTypeChooser choices={['ward_visit']} onPick={vi.fn()} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
