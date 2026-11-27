import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach } from 'vitest'
import type {
  PublicGeneralScheduleItem,
  PublicScheduleItem,
} from '@/types/publicSchedule'
import styles from './PublicSchedulePage.module.scss'
import PublicSchedulePage from './PublicSchedulePage'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
}))

const { fetchPublicSchedulePageDataMock, fetchPublicScheduleHistoryMock } = vi.hoisted(() => ({
  fetchPublicSchedulePageDataMock: vi.fn(),
  fetchPublicScheduleHistoryMock: vi.fn(),
}))

vi.mock('@/services/publicScheduleService', () => ({
  fetchPublicSchedulePageData: fetchPublicSchedulePageDataMock,
  fetchPublicScheduleHistory: fetchPublicScheduleHistoryMock,
}))

const scheduleItem: PublicScheduleItem = {
  id: 'sched-1',
  type: 'ward_visit',
  unitId: 'unit-1',
  date: '2099-01-10',
  startTime: '10:00',
  endTime: '11:00',
  status: 'confirmed',
}

const pastGeneralItem: PublicGeneralScheduleItem = {
  id: 'gen-past',
  title: '지난 대회',
  date: '2000-01-01',
  category: 'conference',
  isPublic: true,
}

const futureGeneralItem: PublicGeneralScheduleItem = {
  id: 'gen-future',
  title: '다가올 금식',
  date: '2099-02-02',
  category: 'fasting',
  isPublic: true,
}

const multiDayGeneralItem: PublicGeneralScheduleItem = {
  id: 'gen-multiday',
  title: '1박 2일 대회',
  date: '2099-03-10',
  endDate: '2099-03-11',
  category: 'conference',
  isPublic: true,
}

function renderPage(token: string) {
  return render(<PublicSchedulePage token={token} />)
}

describe('PublicSchedulePage — general event row layout', () => {
  beforeEach(() => {
    sessionStorage.clear()
    fetchPublicSchedulePageDataMock.mockReset()
    fetchPublicSchedulePageDataMock.mockResolvedValue({
      schedules: [scheduleItem],
      generalSchedules: [pastGeneralItem, futureGeneralItem],
      scopeDisplayName: null,
    })
  })

  it('gives the general-event row and the schedule row the same wrapper structure', async () => {
    renderPage('token-structure')
    await waitFor(() => expect(screen.getByText('지난 대회')).toBeInTheDocument())

    const rows = document.querySelectorAll(`.${styles.scheduleRow}`)
    expect(rows.length).toBe(3) // 1 schedule + 2 general

    for (const row of Array.from(rows)) {
      // Every row's colorBar/dateCol/itemBody must live one level down, inside
      // a single .scheduleRowMain wrapper — not stacked directly under
      // .scheduleRow (that was the bug: the event branch skipped the wrapper
      // and flex-direction: column on .scheduleRow made everything stack).
      const mains = row.querySelectorAll(`:scope > .${styles.scheduleRowMain}`)
      expect(mains.length).toBe(1)

      const main = mains[0]
      expect(main.querySelectorAll(`:scope > .${styles.colorBar}`).length).toBe(1)
      expect(main.querySelectorAll(`:scope > .${styles.dateCol}`).length).toBe(1)
      expect(main.querySelectorAll(`:scope > .${styles.itemBody}`).length).toBe(1)

      // colorBar/dateCol/itemBody must NOT be direct children of .scheduleRow
      expect(row.querySelectorAll(`:scope > .${styles.colorBar}`).length).toBe(0)
      expect(row.querySelectorAll(`:scope > .${styles.dateCol}`).length).toBe(0)
    }
  })

  it('marks a past general-event row with data-past="true"', async () => {
    renderPage('token-past')
    await waitFor(() => expect(screen.getByText('지난 대회')).toBeInTheDocument())

    const pastRow = screen.getByText('지난 대회').closest(`.${styles.scheduleRow}`)
    expect(pastRow).toHaveAttribute('data-past', 'true')

    const futureRow = screen.getByText('다가올 금식').closest(`.${styles.scheduleRow}`)
    expect(futureRow).toHaveAttribute('data-past', 'false')
  })

  it('flags general-event rows with data-kind="general" but leaves schedule rows unflagged', async () => {
    renderPage('token-kind')
    await waitFor(() => expect(screen.getByText('지난 대회')).toBeInTheDocument())

    const generalRow = screen.getByText('지난 대회').closest(`.${styles.scheduleRow}`)
    expect(generalRow).toHaveAttribute('data-kind', 'general')

    const scheduleRow = screen.getByText(/unit-1/).closest(`.${styles.scheduleRow}`)
    expect(scheduleRow).not.toHaveAttribute('data-kind')
  })
})

// 여러 날 행사가 구글 캘린더·ICS에서는 이틀로, 공개 일정표에서만 하루로 보이면
// 같은 행사를 두 곳에서 다르게 안내하는 셈이 된다.
describe('PublicSchedulePage — 여러 날 행사', () => {
  beforeEach(() => {
    sessionStorage.clear()
    fetchPublicSchedulePageDataMock.mockReset()
    fetchPublicSchedulePageDataMock.mockResolvedValue({
      schedules: [],
      generalSchedules: [multiDayGeneralItem, futureGeneralItem],
      scopeDisplayName: null,
    })
  })

  it('종료일이 있으면 날짜 칸에 시작일과 종료일을 함께 보여준다', async () => {
    renderPage('token-multiday')
    await waitFor(() => expect(screen.getByText('1박 2일 대회')).toBeInTheDocument())

    const row = screen.getByText('1박 2일 대회').closest(`.${styles.scheduleRow}`)!
    expect(row.querySelector(`.${styles.date}`)).toHaveTextContent('3.10')
    expect(row.querySelector(`.${styles.dateEnd}`)).toHaveTextContent('3.11')
  })

  it('하루짜리 행사는 요일만 보여주고 종료일 줄을 만들지 않는다', async () => {
    renderPage('token-singleday')
    await waitFor(() => expect(screen.getByText('다가올 금식')).toBeInTheDocument())

    const row = screen.getByText('다가올 금식').closest(`.${styles.scheduleRow}`)!
    expect(row.querySelector(`.${styles.dow}`)).toBeInTheDocument()
    expect(row.querySelector(`.${styles.dateEnd}`)).toBeNull()
  })
})

describe('PublicSchedulePage — 이전 일정 불러오기', () => {
  const olderVisit: PublicScheduleItem = { ...scheduleItem, id: 'older-1', date: '2098-12-01', customTitle: '지난 방문' }

  beforeEach(() => {
    sessionStorage.clear()
    fetchPublicSchedulePageDataMock.mockReset()
    fetchPublicScheduleHistoryMock.mockReset()
  })

  it('서버가 경계를 주지 않으면(배포 전) 이전 일정 줄을 보이지 않는다', async () => {
    fetchPublicSchedulePageDataMock.mockResolvedValue({
      schedules: [scheduleItem],
      generalSchedules: [],
      scopeDisplayName: null,
    })
    renderPage('token-no-history')
    await waitFor(() => expect(document.querySelector(`.${styles.scheduleRow}`)).not.toBeNull())
    expect(screen.queryByText('public.historyLoad')).toBeNull()
  })

  it('버튼을 누르면 경계 이전 일정을 받아 위에 붙이고, 끝이면 더 없음을 보여준다', async () => {
    fetchPublicSchedulePageDataMock.mockResolvedValue({
      schedules: [scheduleItem],
      generalSchedules: [],
      scopeDisplayName: null,
      historyBefore: '2099-01-03',
    })
    fetchPublicScheduleHistoryMock.mockResolvedValue({
      schedules: [olderVisit],
      generalSchedules: [],
      nextBefore: null,
    })
    renderPage('token-history')

    fireEvent.click(await screen.findByText('public.historyLoad'))

    await waitFor(() => expect(screen.getByText('지난 방문')).toBeInTheDocument())
    expect(fetchPublicScheduleHistoryMock).toHaveBeenCalledWith('token-history', '2099-01-03')
    expect(screen.getByText('public.historyEnd')).toBeInTheDocument()
    const ids = Array.from(document.querySelectorAll('[data-entry-id]')).map((el) => el.getAttribute('data-entry-id'))
    expect(ids).toEqual(['older-1', 'sched-1'])
  })

  it('다음 쪽은 서버가 준 nextBefore로 이어 부른다', async () => {
    fetchPublicSchedulePageDataMock.mockResolvedValue({
      schedules: [scheduleItem],
      generalSchedules: [],
      scopeDisplayName: null,
      historyBefore: '2099-01-03',
    })
    fetchPublicScheduleHistoryMock
      .mockResolvedValueOnce({ schedules: [olderVisit], generalSchedules: [], nextBefore: '2098-12-01' })
      .mockResolvedValueOnce({ schedules: [], generalSchedules: [], nextBefore: null })
    renderPage('token-history-2')

    fireEvent.click(await screen.findByText('public.historyLoad'))
    await waitFor(() => expect(screen.getByText('지난 방문')).toBeInTheDocument())
    fireEvent.click(screen.getByText('public.historyLoad'))

    await waitFor(() => expect(screen.getByText('public.historyEnd')).toBeInTheDocument())
    expect(fetchPublicScheduleHistoryMock).toHaveBeenLastCalledWith('token-history-2', '2098-12-01')
  })

  it('실패하면 다시 시도 버튼을 보여주고, 누르면 같은 경계로 다시 부른다', async () => {
    fetchPublicSchedulePageDataMock.mockResolvedValue({
      schedules: [scheduleItem],
      generalSchedules: [],
      scopeDisplayName: null,
      historyBefore: '2099-01-03',
    })
    fetchPublicScheduleHistoryMock
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ schedules: [olderVisit], generalSchedules: [], nextBefore: null })
    renderPage('token-history-err')

    fireEvent.click(await screen.findByText('public.historyLoad'))
    fireEvent.click(await screen.findByText('public.retry'))

    await waitFor(() => expect(screen.getByText('지난 방문')).toBeInTheDocument())
    expect(fetchPublicScheduleHistoryMock).toHaveBeenCalledTimes(2)
    expect(fetchPublicScheduleHistoryMock).toHaveBeenLastCalledWith('token-history-err', '2099-01-03')
  })
})

describe('PublicSchedulePage — 이전 일정과 오늘 자동 스크롤', () => {
  const olderVisit: PublicScheduleItem = { ...scheduleItem, id: 'older-1', date: '2000-12-01', customTitle: '지난 방문' }
  const todayVisit: PublicScheduleItem = { ...scheduleItem, id: 'later-1', date: '2099-01-10' }
  const original = HTMLElement.prototype.getBoundingClientRect

  beforeEach(() => {
    sessionStorage.clear()
    fetchPublicSchedulePageDataMock.mockReset()
    fetchPublicScheduleHistoryMock.mockReset()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    // "오늘" 표시는 처음엔 화면 위쪽(100px)에 있고, 이전 일정이 붙으면 아래(2000px)로 밀린다.
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const pushed = document.querySelector('[data-entry-id="older-1"]') !== null
      const top = this.className.includes(styles.todayMarker) ? (pushed ? 2000 : 100) : 0
      return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) }
    }
  })

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = original
    vi.restoreAllMocks()
  })

  it('오늘이 이미 보여 내리지 않았다면, 이전 일정을 붙여도 오늘로 끌어내리지 않는다', async () => {
    fetchPublicSchedulePageDataMock.mockResolvedValue({
      schedules: [todayVisit],
      generalSchedules: [],
      scopeDisplayName: null,
      historyBefore: '2001-01-01',
    })
    fetchPublicScheduleHistoryMock.mockResolvedValue({
      schedules: [olderVisit],
      generalSchedules: [],
      nextBefore: null,
    })
    renderPage('token-history-scroll')

    fireEvent.click(await screen.findByText('public.historyLoad'))
    await waitFor(() => expect(screen.getByText('지난 방문')).toBeInTheDocument())

    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})
