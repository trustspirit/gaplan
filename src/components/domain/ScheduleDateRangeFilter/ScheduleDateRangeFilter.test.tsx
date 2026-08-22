import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DateRange, ScheduleDateRangeSetting } from '@/hooks/useScheduleDateRange'
import { ScheduleDateRangeFilter } from './ScheduleDateRangeFilter'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

// useScheduleDateRange의 기본 범위(2개월 전 ~ 6개월 후)에 해당하는 값
const rollingRange: DateRange = { start: '2026-06-01', end: '2027-02-01' }

function renderFilter(
  setting: ScheduleDateRangeSetting,
  currentRange: DateRange = rollingRange,
) {
  const onChange = vi.fn()
  render(
    <ScheduleDateRangeFilter
      setting={setting}
      currentRange={currentRange}
      onChange={onChange}
    />,
  )
  return { onChange }
}

function dateInputs() {
  return {
    start: screen.getByLabelText('schedule.filterStartDate'),
    end: screen.getByLabelText('schedule.filterEndDate'),
  }
}

// 날짜 칸이 「직접 입력」 버튼 뒤에 숨어 있으면 기간을 바꾸려면 두 번 눌러야 하고,
// 기본 기간이 실제로 언제부터 언제까지인지도 화면에 나오지 않는다.
describe('ScheduleDateRangeFilter', () => {
  it('기본 기간에서도 날짜 두 칸을 보여준다', () => {
    renderFilter({ preset: 'rolling' })

    const { start, end } = dateInputs()
    expect(start).toBeInTheDocument()
    expect(end).toBeInTheDocument()
  })

  it('기본 기간이면 적용 중인 범위(2개월 전 ~ 6개월 후)를 칸에 채워 보여준다', () => {
    renderFilter({ preset: 'rolling' })

    const { start, end } = dateInputs()
    expect(start).toHaveValue('2026-06-01')
    expect(end).toHaveValue('2027-02-01')
  })

  it("'직접 입력' 버튼을 두지 않는다", () => {
    renderFilter({ preset: 'rolling' })

    expect(screen.queryByRole('button', { name: 'schedule.filterCustom' })).toBeNull()
  })

  it('칸을 고치면 그 자리에서 직접 입력 기간으로 저장한다', () => {
    const { onChange } = renderFilter({ preset: 'rolling' })
    const { start } = dateInputs()

    fireEvent.change(start, { target: { value: '2026-09-01' } })

    expect(onChange).toHaveBeenCalledWith({
      preset: 'custom',
      customStart: '2026-09-01',
      customEnd: '2027-02-01',
    })
  })

  it('시작일이 종료일보다 늦어지면 저장하지 않는다', () => {
    const { onChange } = renderFilter({ preset: 'rolling' })
    const { start } = dateInputs()

    fireEvent.change(start, { target: { value: '2027-03-01' } })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('기본 기간일 때는 되돌리기 버튼을 보여주지 않는다', () => {
    renderFilter({ preset: 'rolling' })

    expect(screen.queryByRole('button', { name: 'schedule.filterReset' })).toBeNull()
  })

  it('직접 입력 중이면 저장된 범위를 칸에 채우고 되돌리기 버튼을 보여준다', () => {
    const customRange: DateRange = { start: '2026-09-01', end: '2026-09-30' }
    renderFilter(
      { preset: 'custom', customStart: '2026-09-01', customEnd: '2026-09-30' },
      customRange,
    )

    const { start, end } = dateInputs()
    expect(start).toHaveValue('2026-09-01')
    expect(end).toHaveValue('2026-09-30')
    expect(screen.getByRole('button', { name: 'schedule.filterReset' })).toBeInTheDocument()
  })

  it('되돌리기를 누르면 기본 기간으로 돌아간다', async () => {
    const { onChange } = renderFilter(
      { preset: 'custom', customStart: '2026-09-01', customEnd: '2026-09-30' },
      { start: '2026-09-01', end: '2026-09-30' },
    )

    await userEvent.click(screen.getByRole('button', { name: 'schedule.filterReset' }))

    expect(onChange).toHaveBeenCalledWith({ preset: 'rolling' })
  })
})
