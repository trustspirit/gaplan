import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchPublicSchedulePageData,
  type PublicSchedulePageData,
} from './publicScheduleService'

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
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchPublicSchedulePageData', () => {
  it('loads public schedule and general events through one HTTP request', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ result: SAMPLE }),
    } as Response)

    await expect(fetchPublicSchedulePageData('token-123')).resolves.toEqual(SAMPLE)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('getPublicSchedules')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init!.body as string)).toEqual({ data: { token: 'token-123' } })
  })

  it('tolerates a response missing generalSchedules while the backend rolls forward', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          schedules: SAMPLE.schedules,
          scopeDisplayName: null,
        },
      }),
    } as Response)

    await expect(fetchPublicSchedulePageData('token-123')).resolves.toEqual({
      schedules: SAMPLE.schedules,
      generalSchedules: [],
      scopeDisplayName: null,
    })
  })

  it('reconstructs a functions/permission-denied code from a PERMISSION_DENIED error so the private-link screen still shows', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { status: 'PERMISSION_DENIED', message: 'Invalid token' } }),
    }))
    await expect(fetchPublicSchedulePageData('bad-token')).rejects.toMatchObject({
      code: 'functions/permission-denied',
    })
  })
})
