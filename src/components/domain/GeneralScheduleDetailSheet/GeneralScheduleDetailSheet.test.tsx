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
