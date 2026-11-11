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

// 예전 "참석 등록" 기록은 지금 새로 생기지 않는다. 기록이 없을 때 "참석자 없음"을 늘 보여주면
// 새로 생긴 "담당 지역 칠십인 참석" 체크와 헷갈린다.
describe('GeneralScheduleDetailSheet 예전 참석 기록', () => {
  const base = {
    currentUid: 'u1', currentRole: 'seventy',
    onClose: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(),
  }

  it('기록이 없으면 참석자 영역을 그리지 않는다', () => {
    render(<GeneralScheduleDetailSheet {...base} event={event()} attendances={[]} />)
    expect(screen.queryByText('generalSchedule.noAttendees')).toBeNull()
    expect(screen.queryByText('generalSchedule.attendees')).toBeNull()
  })

  it('남아 있는 기록이 있으면 보여준다', () => {
    render(
      <GeneralScheduleDetailSheet
        {...base}
        event={event()}
        attendances={[{
          id: 'a1', type: 'general_attendance', seventyUid: 'sv', unitId: '', presidentUid: null,
          date: '2026-09-03', startTime: '00:00', endTime: '23:59', status: 'confirmed',
          createdBy: 'sv', customTitle: '김칠십',
        }]}
      />,
    )
    expect(screen.getByText('김칠십')).toBeInTheDocument()
  })
})

// 이 시트는 자기 제목 줄을 직접 그려 공용 머리글(닫기 버튼 포함)을 쓰지 않는다. 닫기 버튼이
// 없으면 바깥을 눌러야만 닫히고, 다이얼로그에 이름도 없었다.
describe('GeneralScheduleDetailSheet 닫기와 이름', () => {
  const base = {
    attendances: [], currentUid: 'u1', currentRole: 'president',
    onEdit: vi.fn(), onDelete: vi.fn(),
  }

  it('행사 제목이 다이얼로그의 이름이다', () => {
    render(<GeneralScheduleDetailSheet {...base} event={event()} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: '지역대회' })).toBeInTheDocument()
  })

  it('고칠 권한이 없는 사람에게도 닫기 버튼이 있고, 누르면 닫는다', () => {
    const onClose = vi.fn()
    render(<GeneralScheduleDetailSheet {...base} event={event()} onClose={onClose} />)
    expect(screen.queryByLabelText('common.edit')).toBeNull()
    screen.getByLabelText('common.close').click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
