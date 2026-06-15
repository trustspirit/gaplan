import { beforeEach, describe, expect, it, vi } from 'vitest'
import { publicCallable } from './publicFunctions'
import {
  fetchPublicSchedulePageData,
  type PublicSchedulePageData,
} from './publicScheduleService'

const { callable } = vi.hoisted(() => ({
  callable: vi.fn(),
}))

vi.mock('./publicFunctions', () => ({
  publicCallable: vi.fn(() => callable),
}))

const SAMPLE: PublicSchedulePageData = {
  schedules: [
    {
      id: 's1',
      type: 'ward_visit',
      unitId: 'u1',
      date: '2026-07-01',
      startTime: '10:00',
      endTime: '12:00',
      status: 'confirmed',
    },
  ],
  generalSchedules: [
    {
      id: 'g1',
      title: 'Conference',
      date: '2026-07-05',
      category: 'conference',
      isPublic: true,
    },
  ],
  scopeDisplayName: '서울 CC',
}

beforeEach(() => {
  callable.mockReset()
  vi.mocked(publicCallable).mockClear()
})

describe('fetchPublicSchedulePageData', () => {
  it('loads public schedule and general events through one callable request', async () => {
    callable.mockResolvedValue({ data: SAMPLE })

    await expect(fetchPublicSchedulePageData('token-123')).resolves.toEqual(SAMPLE)

    expect(publicCallable).toHaveBeenCalledTimes(1)
    expect(publicCallable).toHaveBeenCalledWith('getPublicSchedules')
    expect(callable).toHaveBeenCalledWith({ token: 'token-123' })
  })

  it('keeps old callable responses usable while the backend rolls forward', async () => {
    callable.mockResolvedValue({
      data: {
        schedules: SAMPLE.schedules,
        scopeDisplayName: null,
      },
    })

    await expect(fetchPublicSchedulePageData('token-123')).resolves.toEqual({
      schedules: SAMPLE.schedules,
      generalSchedules: [],
      scopeDisplayName: null,
    })
  })
})
