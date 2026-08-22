import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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

const { fetchPublicSchedulePageDataMock } = vi.hoisted(() => ({
  fetchPublicSchedulePageDataMock: vi.fn(),
}))

vi.mock('@/services/publicScheduleService', () => ({
  fetchPublicSchedulePageData: fetchPublicSchedulePageDataMock,
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

function renderPage(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/public/schedule/${token}`]}>
      <Routes>
        <Route path="/public/schedule/:token" element={<PublicSchedulePage />} />
      </Routes>
    </MemoryRouter>,
  )
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
