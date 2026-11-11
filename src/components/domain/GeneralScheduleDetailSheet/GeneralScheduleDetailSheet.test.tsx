import { render, screen } from '@testing-library/react'
import dayjs from 'dayjs'
import type { GeneralSchedule } from '@/types'
import { GeneralScheduleDetailSheet } from './GeneralScheduleDetailSheet'

// jsdom has no matchMedia — mock the hook directly, per repo convention
// (ScheduleItem.test.tsx, SeventyHome.test.tsx, ...).
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))
// dateFormat is used as an actual dayjs format string by the component — give it a
// deterministic one instead of the default `t: (k) => k` echo (which would leak dayjs
// format tokens like the bare "m" in "...Format" and make the test time-of-day-flaky).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => (k === 'generalSchedule.dateFormat' ? 'YYYY-MM-DD' : k),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

function event(over: Partial<GeneralSchedule> = {}): GeneralSchedule {
  return {
    id: 'g1',
    title: '지역대회',
    date: '2026-09-03',
    category: 'conference',
    createdBy: 'admin',
    createdAt: '2026-08-01',
    isPublic: true,
    ...over,
  }
}

// event-toast-and-multiday brief §2-5: 여러 날 행사는 날짜를 범위로 보여준다. 하루짜리는
// 지금 그대로 하나의 날짜만 보여준다. GeneralEventItem과 같은 범위 조립 규칙
// (formatEventDateRange)을 공유한다.
describe('GeneralScheduleDetailSheet 여러 날 행사', () => {
  it('종료일이 없으면 시작일 하나만 보여준다', () => {
    render(
      <GeneralScheduleDetailSheet
        event={event()}
        attendances={[]}
        currentUid="u1"
        currentRole="seventy"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText(dayjs('2026-09-03').format('YYYY-MM-DD'))).toBeInTheDocument()
  })

  it('종료일이 있으면 시작일–종료일 범위로 보여준다', () => {
    render(
      <GeneralScheduleDetailSheet
        event={event({ date: '2026-09-03', endDate: '2026-09-04' })}
        attendances={[]}
        currentUid="u1"
        currentRole="seventy"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    const expected = `${dayjs('2026-09-03').format('YYYY-MM-DD')} – ${dayjs('2026-09-04').format('YYYY-MM-DD')}`
    expect(screen.getByText(expected)).toBeInTheDocument()
  })
})

// 담당 지역 칠십인의 참석 여부. 표시할 수 있는 사람에게는 체크 칸, 그 밖에는 참석일 때만 배지다.
describe('GeneralScheduleDetailSheet 담당 지역 칠십인 참석', () => {
  const base = {
    attendances: [], currentUid: 'u1', currentRole: 'seventy',
    onClose: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(),
  }

  it('onToggleSeventyAttends가 있으면 체크 칸이 나오고 누르면 바뀔 값을 넘긴다', async () => {
    const onToggle = vi.fn()
    render(<GeneralScheduleDetailSheet {...base} event={event()} onToggleSeventyAttends={onToggle} />)
    const box = screen.getByLabelText('generalSchedule.seventyAttendsLabel')
    expect(box).not.toBeChecked()
    box.click()
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('참석으로 표시된 행사는 체크된 채로 열린다', () => {
    render(
      <GeneralScheduleDetailSheet
        {...base}
        event={event({ seventyAttends: true })}
        onToggleSeventyAttends={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('generalSchedule.seventyAttendsLabel')).toBeChecked()
  })

  it('표시할 수 없는 사람에게는 참석일 때만 배지를 보여준다', () => {
    const { rerender } = render(<GeneralScheduleDetailSheet {...base} event={event()} />)
    expect(screen.queryByLabelText('generalSchedule.seventyAttendsLabel')).toBeNull()
    expect(screen.queryByText('generalSchedule.seventyAttends')).toBeNull()

    rerender(<GeneralScheduleDetailSheet {...base} event={event({ seventyAttends: true })} />)
    expect(screen.getByText('generalSchedule.seventyAttends')).toBeInTheDocument()
  })
})
