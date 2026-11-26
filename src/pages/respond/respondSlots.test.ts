import { computeInterviewSlots } from '@/services/availabilityService'
import { splitDateSlots } from './respondSlots'

vi.mock('@/firebase', () => ({ db: 'db', functions: 'functions' }))

const painted = [
  { date: '2026-12-06', timeRanges: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '14:00', endTime: '15:10' }] },
  { date: '2026-12-13', timeRanges: [{ startTime: '19:30', endTime: '21:00' }] },
]

describe('splitDateSlots', () => {
  it('cuts each painted range into interview-length slots', () => {
    expect(splitDateSlots([painted[1]], 30)[0].timeRanges).toEqual([
      { startTime: '19:30', endTime: '20:00' },
      { startTime: '20:00', endTime: '20:30' },
      { startTime: '20:30', endTime: '21:00' },
    ])
  })

  it('drops a remainder too short for one interview', () => {
    expect(splitDateSlots([{ date: '2026-12-06', timeRanges: [{ startTime: '14:00', endTime: '15:10' }] }], 30)[0].timeRanges)
      .toHaveLength(2)
  })

  it.each([20, 30, 45, 60])('offers the same slots as the in-app picker (%i min)', (minutes) => {
    const here = splitDateSlots(painted, minutes).flatMap((d) =>
      d.timeRanges.map((r) => `${d.date} ${r.startTime}-${r.endTime}`),
    )
    const inApp = computeInterviewSlots(painted, minutes).map((s) => `${s.date} ${s.startTime}-${s.endTime}`)
    expect(here).toEqual(inApp)
  })
})
