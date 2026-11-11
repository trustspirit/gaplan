import type { DateRange } from './dateRange'

/**
 * 폼 테스트용 DateRangePicker 대역. 달력 칸을 눌러 날짜를 맞추는 일은 DateRangePicker 자체
 * 테스트가 고정하므로, 폼 테스트는 "이 날짜/범위가 선택됐을 때 폼이 무엇을 하는가"만 본다 —
 * 날짜 입력칸 두 개로 값을 직접 넣는다. 종료일 칸의 이름은 `<label>-end`다.
 *
 * 쓰는 법:
 *   vi.mock('@/components/domain/DateRangePicker/DateRangePicker', async () => ({
 *     DateRangePicker: (await import('@/components/domain/DateRangePicker/testing')).DateRangePickerStub,
 *   }))
 */
export function DateRangePickerStub({
  label,
  value,
  onChange,
}: {
  label: string
  value: DateRange
  onChange: (range: DateRange) => void
}) {
  return (
    <div>
      <input
        type="date"
        aria-label={label}
        value={value.start}
        onChange={(e) => onChange({ start: e.target.value, end: value.end })}
      />
      <input
        type="date"
        aria-label={`${label}-end`}
        value={value.end}
        onChange={(e) => onChange({ start: value.start, end: e.target.value })}
      />
    </div>
  )
}
