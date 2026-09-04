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
      status: 200,
      json: async () => ({ data: SAMPLE }),
    } as Response)

    await expect(fetchPublicSchedulePageData('token-123')).resolves.toEqual(SAMPLE)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('getPublicSchedules')
    expect(init).toMatchObject({ method: 'POST' })
    expect(JSON.parse(init!.body as string)).toEqual({ data: { token: 'token-123' } })
  })

  it('still resolves a legacy {result} envelope, tolerating a response missing generalSchedules', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
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
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { status: 'PERMISSION_DENIED', message: 'Invalid token' } }),
    } as Response)

    await expect(fetchPublicSchedulePageData('bad-token')).rejects.toMatchObject({
      code: 'functions/permission-denied',
    })
  })

  it('falls back to the HTTP status when a non-2xx response has an unparseable body', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Response)

    await expect(fetchPublicSchedulePageData('token-123')).rejects.toMatchObject({
      code: 'functions/permission-denied',
    })
  })

  it('rejects with functions/internal instead of throwing a bare TypeError when a 2xx body has neither data nor result', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response)

    await expect(fetchPublicSchedulePageData('token-123')).rejects.toMatchObject({
      code: 'functions/internal',
    })
  })
})
