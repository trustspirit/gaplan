import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RespondPage from './RespondPage'
import type { PublicTaskInfo } from './usePublicTask'

const getMock = vi.fn()
const submitSlotsMock = vi.fn()
const submitWardsMock = vi.fn()

vi.mock('@/services/publicFunctions', () => ({
  publicCallable: (name: string) =>
    name === 'getPublicTaskInfo' ? getMock : name === 'submitAvailabilityAnon' ? submitSlotsMock : submitWardsMock,
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) =>
      k === 'respond.dateFormat' ? 'M/D' : o ? `${k}:${JSON.stringify(o)}` : k,
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
}))

function task(over: Partial<PublicTaskInfo> = {}): PublicTaskInfo {
  return {
    taskId: 'task1', title: '', note: '', type: 'select_visit', status: 'pending', dueDate: '2026-12-20',
    availableDates: ['2027-01-10', '2027-01-17'],
    availableDateSlots: [], slotDurationMinutes: 30,
    unitId: '', assignedTo: 'p1', respondedSlots: [], wardAssignments: [],
    wards: ['녹번 와드', '신촌 와드'],
    ...over,
  }
}

async function open(over: Partial<PublicTaskInfo> = {}) {
  getMock.mockResolvedValue({ data: task(over) })
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/respond/task1?t=0123456789abcdef']}>
      <Routes>
        <Route path="/respond/:taskId" element={<RespondPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await screen.findByRole('button', { name: 'respond.submit' })
  return user
}

beforeEach(() => {
  localStorage.clear()
  getMock.mockReset()
  submitSlotsMock.mockReset().mockResolvedValue({ data: { success: true } })
  submitWardsMock.mockReset().mockResolvedValue({ data: { success: true } })
})

describe('RespondPage', () => {
  it("lists the stake's wards for a new ward-visit request and sends the chosen dates", async () => {
    const user = await open()
    // 새 요청에는 아직 응답(wardAssignments)이 없다 — 와드 목록은 서버가 준 것으로 그린다
    await user.selectOptions(screen.getByRole('combobox', { name: '신촌 와드' }), '2027-01-17')
    await user.click(screen.getByRole('button', { name: 'respond.submit' }))

    await waitFor(() => expect(submitWardsMock).toHaveBeenCalled())
    expect(submitWardsMock.mock.calls[0][0]).toEqual({
      taskId: 'task1',
      token: '0123456789abcdef',
      wardAssignments: [{ wardName: '신촌 와드', date: '2027-01-17' }],
    })
    expect(await screen.findByText('respond.successTitle')).toBeInTheDocument()
  })

  it('shows dates readably, not as raw ISO strings', async () => {
    await open()
    expect(screen.getAllByRole('option', { name: '1/10' }).length).toBeGreaterThan(0)
  })

  it('starts from the answer already given', async () => {
    await open({ status: 'responded', wardAssignments: [{ wardName: '녹번 와드', date: '2027-01-10' }] })
    await waitFor(() => expect(screen.getByRole('combobox', { name: '녹번 와드' })).toHaveValue('2027-01-10'))
    expect(screen.getByRole('button', { name: 'respond.submit' })).toBeEnabled()
  })

  it('offers interview-length slots rather than the whole painted range', async () => {
    const user = await open({
      type: 'select_interview',
      wards: [],
      availableDateSlots: [{ date: '2027-01-10', timeRanges: [{ startTime: '09:00', endTime: '10:00' }] }],
    })
    expect(screen.queryByRole('button', { name: '09:00 – 10:00' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '09:30 – 10:00' }))
    await user.click(screen.getByRole('button', { name: 'respond.submit' }))
    await waitFor(() => expect(submitSlotsMock).toHaveBeenCalled())
    expect(submitSlotsMock.mock.calls[0][0].respondedSlots).toEqual([
      { date: '2027-01-10', startTime: '09:30', endTime: '10:00' },
    ])
  })

  it('reports a failed submit next to the button', async () => {
    submitWardsMock.mockRejectedValue(new Error('closed'))
    const user = await open()
    await user.selectOptions(screen.getByRole('combobox', { name: '녹번 와드' }), '2027-01-10')
    await user.click(screen.getByRole('button', { name: 'respond.submit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('closed')
  })
})
