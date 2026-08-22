import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expectNoAccentStripe } from '@/components/ui/testing/bannedPatterns'
import { expectNoViewportWidthQuery } from '@/components/ui/testing/responsiveScope'
import type { Schedule } from '@/types'
import { ScheduleItem } from './ScheduleItem'

// Keys this task moves out of hardcoded Korean resolve to their real Korean
// text here, same as production i18n would — so these assertions hold both
// before and after the refactor (they don't care whether the string was
// literal JSX or came through t()). Everything else falls back to the key
// itself, matching this repo's usual `t: (k) => k` test convention.
const KO_TEXT: Record<string, string> = {
  'schedule.attendanceVerified': '참석 확인됨',
  'schedule.presidentAccompanied': '스테이크 회장 동행',
  'schedule.presidentAccompaniedShort': '회장 동행',
}
const t = (key: string) => KO_TEXT[key] ?? key

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t, i18n: { language: 'ko' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
// jsdom has no matchMedia — mock the hook directly, per repo convention
// (SeventyHome.test.tsx, LeaderEditSheet.test.tsx, TopBar.test.tsx, ...).
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => false }))

function schedule(over: Partial<Schedule> = {}): Schedule {
  return {
    id: 's1',
    type: 'ward_visit',
    seventyUid: 'sv1',
    unitId: 'u1',
    presidentUid: null,
    date: '2099-01-01',
    startTime: '10:00',
    endTime: '11:00',
    status: 'confirmed',
    createdBy: 'a1',
    ...over,
  } as Schedule
}

describe('ScheduleItem', () => {
  it('renders the ward name and the type badge', () => {
    render(<ScheduleItem schedule={schedule({ wardName: '녹번 와드' })} unitName="서울 스테이크" />)
    expect(screen.getByText('녹번 와드', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('schedule.type.ward_visit')).toBeInTheDocument()
  })

  it('opens the kebab menu and offers edit and delete', async () => {
    render(
      <ScheduleItem
        schedule={schedule()}
        unitName="서울 스테이크"
        canEdit
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'common.more' }))
    expect(screen.getByRole('button', { name: 'common.edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.delete' })).toBeInTheDocument()
  })

  it('calls onEdit with nothing extra when edit is chosen', async () => {
    const onEdit = vi.fn()
    render(
      <ScheduleItem
        schedule={schedule()}
        unitName="서울 스테이크"
        canEdit
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'common.more' }))
    await userEvent.click(screen.getByRole('button', { name: 'common.edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith()
  })

  it('asks for confirmation before calling onDelete', async () => {
    const onDelete = vi.fn()
    render(
      <ScheduleItem
        schedule={schedule()}
        unitName="서울 스테이크"
        canEdit
        onEdit={vi.fn()}
        onDelete={onDelete}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'common.more' }))
    await userEvent.click(screen.getByRole('button', { name: 'common.delete' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('toggles the notes panel', async () => {
    render(<ScheduleItem schedule={schedule({ notes: '테스트 메모' })} unitName="서울 스테이크" />)
    expect(screen.queryByText('테스트 메모')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '메모 보기' }))
    expect(screen.getByText('테스트 메모')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '메모 보기' }))
    expect(screen.queryByText('테스트 메모')).not.toBeInTheDocument()
  })

  it('offers the calendar-add button only when showCalendarAdd is set', () => {
    const { rerender } = render(
      <ScheduleItem schedule={schedule()} unitName="서울 스테이크" showCalendarAdd={false} />,
    )
    expect(screen.queryByTitle('내 캘린더에 추가')).not.toBeInTheDocument()

    rerender(<ScheduleItem schedule={schedule()} unitName="서울 스테이크" showCalendarAdd />)
    expect(screen.getByTitle('내 캘린더에 추가')).toBeInTheDocument()
  })

  // Not required by the brief's minimum list, but locks the three badges the
  // task explicitly forbids dropping (verified / president / past) so the
  // widened DataList primitive can't silently lose them in the refactor.
  it('marks a general-attendance schedule as verified', () => {
    render(
      <ScheduleItem schedule={schedule({ type: 'general_attendance' })} unitName="서울 스테이크" />,
    )
    expect(screen.getByLabelText('참석 확인됨')).toBeInTheDocument()
  })

  it('flags a ward visit the stake president is accompanying', () => {
    render(
      <ScheduleItem
        schedule={schedule({ type: 'ward_visit', presidentAccompanied: true })}
        unitName="서울 스테이크"
      />,
    )
    expect(screen.getByTitle('스테이크 회장 동행')).toBeInTheDocument()
    expect(screen.getByText('회장 동행')).toBeInTheDocument()
  })

  it('does not flag a ward visit the president is not accompanying', () => {
    render(
      <ScheduleItem
        schedule={schedule({ type: 'ward_visit', presidentAccompanied: false })}
        unitName="서울 스테이크"
      />,
    )
    expect(screen.queryByTitle('스테이크 회장 동행')).not.toBeInTheDocument()
  })

  it('marks a past schedule complete and hides the calendar-add button', () => {
    render(
      <ScheduleItem
        schedule={schedule({ date: '2020-01-01' })}
        unitName="서울 스테이크"
        showCalendarAdd
      />,
    )
    expect(screen.getByText('common.complete')).toBeInTheDocument()
    expect(screen.queryByTitle('내 캘린더에 추가')).not.toBeInTheDocument()
  })

  // 판정 R57 — 행 앞의 색 막대 금지.
  it('never puts a colour bar in front of the row', () => {
    expectNoAccentStripe(readFileSync(resolve(__dirname, 'ScheduleItem.module.scss'), 'utf8'))
  })

  // 배지 글자('회장 동행'·'완료')를 숨길지는 화면 크기가 아니라 이 행이 놓인
  // 자리의 폭이 정한다 — 같은 행이 일정 화면의 420px 우측 열에도 들어간다.
  it('hides the badge labels by container width, not by viewport', () => {
    const scss = readFileSync(resolve(__dirname, 'ScheduleItem.module.scss'), 'utf8')
    expectNoViewportWidthQuery(scss)
  })
})
