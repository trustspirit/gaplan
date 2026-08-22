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
