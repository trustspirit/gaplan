import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import type { AppUser } from '@/types'

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

// ScheduleFormModal/GeneralScheduleFormModal은 각자의 테스트가 이미 무겁게 검증한다
// (firebase functions, 대상 규칙, dirty 확인 등). 여기서는 AddScheduleFlow의 상태
// 기계 — 어떤 종류를 골랐을 때 어떤 폼을 어떤 props로 여는지 — 만 본다.
vi.mock('@/components/domain/ScheduleFormModal/ScheduleFormModal', () => ({
  ScheduleFormModal: ({
    fixedType,
    initialDate,
    generalSchedules,
    onBack,
    onClose,
  }: {
    fixedType: string
    initialDate?: string
    generalSchedules?: unknown[]
    onBack?: () => void
    onClose: () => void
  }) => (
    <div
      data-testid="schedule-form"
      data-fixed-type={fixedType}
      data-initial-date={initialDate ?? ''}
      data-general-schedules-count={generalSchedules ? generalSchedules.length : -1}
    >
      {onBack && (
        <button type="button" onClick={onBack}>
          common.back
        </button>
      )}
      <button type="button" onClick={onClose}>
        common.close
      </button>
    </div>
  ),
}))
vi.mock('@/components/domain/GeneralScheduleFormModal/GeneralScheduleFormModal', () => ({
  GeneralScheduleFormModal: ({ onBack, onClose }: { onBack?: () => void; onClose: () => void }) => (
    <div data-testid="event-form">
      {onBack && (
        <button type="button" onClick={onBack}>
          common.back
        </button>
      )}
      <button type="button" onClick={onClose}>
        common.close
      </button>
    </div>
  ),
}))

import { AddScheduleFlow } from './AddScheduleFlow'

function user(over: Partial<AppUser>): AppUser {
  return {
    uid: 'u1',
    email: 'u1@test.com',
    name: '테스트',
    role: 'seventy',
    createdAt: '2026-01-01',
    ...over,
  }
}

describe('AddScheduleFlow', () => {
  it('권한이 없으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(
      <AddScheduleFlow user={user({ role: 'president' })} onClose={vi.fn()} onSaved={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('admin에게는 chooser가 먼저 열린다', () => {
    render(<AddScheduleFlow user={user({ role: 'admin' })} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /schedule.type.ward_visit/ })).toBeInTheDocument()
    expect(screen.queryByTestId('schedule-form')).toBeNull()
    expect(screen.queryByTestId('event-form')).toBeNull()
  })

  it('chooser에서 접견을 고르면 fixedType=interview로 일정 폼이 열린다', async () => {
    render(<AddScheduleFlow user={user({ role: 'admin' })} onClose={vi.fn()} onSaved={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /schedule.type.interview/ }))
    expect(screen.getByTestId('schedule-form')).toHaveAttribute('data-fixed-type', 'interview')
    // chooser는 사라진다
    expect(screen.queryByRole('button', { name: /schedule.type.ward_visit/ })).toBeNull()
  })

  it('chooser에서 행사를 고르면 GeneralScheduleFormModal이 열린다', async () => {
    render(<AddScheduleFlow user={user({ role: 'admin' })} onClose={vi.fn()} onSaved={vi.fn()} />)
    await userEvent.click(
      screen.getByRole('button', { name: /schedule.addChoice.general_schedule.label/ }),
    )
    expect(screen.getByTestId('event-form')).toBeInTheDocument()
  })

  it('칠십인에게는 chooser 없이 행사 폼이 바로 열리고, 뒤로 버튼이 없다', () => {
    render(<AddScheduleFlow user={user({ role: 'seventy' })} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('event-form')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'common.back' })).toBeNull()
  })

  it('폼에서 뒤로를 누르면 chooser로 돌아간다', async () => {
    render(<AddScheduleFlow user={user({ role: 'admin' })} onClose={vi.fn()} onSaved={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /schedule.type.meeting/ }))
    expect(screen.getByTestId('schedule-form')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'common.back' }))
    expect(screen.queryByTestId('schedule-form')).toBeNull()
    expect(screen.getByRole('button', { name: /schedule.type.meeting/ })).toBeInTheDocument()
  })

  it('initialDate와 generalSchedules를 골라 연 폼에 그대로 전달한다', async () => {
    render(
      <AddScheduleFlow
        user={user({ role: 'admin' })}
        initialDate="2026-09-01"
        generalSchedules={[]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /schedule.type.ward_visit/ }))
    const form = screen.getByTestId('schedule-form')
    expect(form).toHaveAttribute('data-initial-date', '2026-09-01')
    expect(form).toHaveAttribute('data-general-schedules-count', '0')
  })
})
