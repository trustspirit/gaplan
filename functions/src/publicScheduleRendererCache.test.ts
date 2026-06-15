import { describe, expect, it } from 'vitest'
import { createTtlCache } from './publicScheduleRendererCache'

describe('createTtlCache', () => {
  it('returns cached values while they are fresh', () => {
    const cache = createTtlCache<string>(300)
    cache.set('index-html', 1000)

    expect(cache.getFresh(1299)).toBe('index-html')
    expect(cache.getFresh(1301)).toBeNull()
  })

  it('keeps stale values available as a network fallback', () => {
    const cache = createTtlCache<string>(300)
    cache.set('stale-index-html', 1000)

    expect(cache.getFresh(1400)).toBeNull()
    expect(cache.getStale()).toBe('stale-index-html')
  })
})
