import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ScheduleType, GeneralSchedule } from '@/types'
import type { ScheduleFormState } from './useScheduleForm'
import { WhenSection } from './WhenSection'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) =>
      opts ? `${k} ${JSON.stringify(opts)}` : k,
    i18n: { language: 'ko' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

// WhenSection도 TargetSection과 마찬가지로 상태를 갖지 않는 순수 렌더 조각이다(Controller
// ruling). useScheduleForm이 하는 부분 병합을 여기서 얇게 흉내 낸다.
function Harness(props: {
  type: ScheduleType
  isSabbath?: boolean
  presidentAccompanied?: boolean
  conflictingEvent?: Pick<GeneralSchedule, 'title'>
  onChange?: (partial: Partial<ScheduleFormState>) => void
}) {
  const [state, setState] = useState<ScheduleFormState>(() => ({
    type: props.type,
    target: { kind: '', unitId: '', wardName: '', ccRegionId: '', freeText: '' },
    date: '',
    startTime: '',
    endTime: '',
    isSabbath: props.isSabbath ?? false,
    presidentAccompanied: props.presidentAccompanied ?? false,
    purpose: 'general',
    relatedVisitId: '',
    location: '',
    customTitle: '',
    zoomLink: '',
    notes: '',
    projectId: '',
    seventyOnly: false,
    seventyNotes: '',
    endDate: '',
  }))

  const handleChange = (partial: Partial<ScheduleFormState>) => {
    props.onChange?.(partial)
    setState((prev) => ({ ...prev, ...partial }))
  }

  return (
    <WhenSection
      type={props.type}
      state={state}
      onChange={handleChange}
      conflictingEvent={props.conflictingEvent}
    />
  )
}

function renderWhen(props: Parameters<typeof Harness>[0]) {
  return render(<Harness {...props} />)
}

describe('WhenSection', () => {
  it('안식일 방문을 켜면 시간이 10:00-12:00으로 채워진다', async () => {
    const onChange = vi.fn()
    renderWhen({ type: 'ward_visit', onChange })
    await userEvent.click(screen.getByLabelText('schedule.sabbathVisit'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ startTime: '10:00', endTime: '12:00' }))
  })

  it('와드 방문이 아니면 안식일·회장 동행 체크가 없다', () => {
    renderWhen({ type: 'interview' })
    expect(screen.queryByLabelText('schedule.sabbathVisit')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('schedule.presidentAccompanied')).not.toBeInTheDocument()
  })

  it('같은 날 행사가 있으면 경고를 보여준다', () => {
    renderWhen({ type: 'meeting', conflictingEvent: { title: '지역 대회' } })
    expect(screen.getByText(/generalSchedule.conflictWarning/)).toBeInTheDocument()
  })
})

// 모임은 여러 날에 걸칠 수 있어 달력(DateRangePicker)으로 날짜를 고른다. 접견·방문은 하루
// 안에 끝나는 일정이라 날짜 한 칸 그대로다.
describe('WhenSection — 모임의 날짜 범위', () => {
  it('모임에는 달력이 나온다', () => {
    renderWhen({ type: 'meeting' })
    expect(screen.getByRole('group', { name: 'schedule.dateLabel' })).toBeInTheDocument()
  })

  it.each(['interview', 'ward_visit'] as const)('%s에는 날짜 입력칸 하나가 그대로 나온다', (type) => {
    renderWhen({ type })
    expect(screen.queryByRole('group', { name: 'schedule.dateLabel' })).toBeNull()
    expect(screen.getByLabelText('schedule.dateLabel')).toHaveAttribute('type', 'date')
  })

  it('달력에서 날짜를 누르면 date와 endDate를 함께 넘긴다', async () => {
    const onChange = vi.fn()
    renderWhen({ type: 'meeting', onChange })
    // 달력은 선택이 없으면 이번 달을 보여준다 — 15일은 어느 달에나 있다.
    const cells = screen.getAllByRole('button').filter((b) => /-15$/.test(b.getAttribute('aria-label') ?? ''))
    await userEvent.click(cells[0])
    expect(onChange).toHaveBeenCalledWith({ date: cells[0].getAttribute('aria-label'), endDate: '' })
  })
})

