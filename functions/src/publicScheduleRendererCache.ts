interface TtlEntry<T> {
  value: T
  cachedAt: number
}

export function createTtlCache<T>(ttlMs: number) {
  let entry: TtlEntry<T> | null = null

  return {
    getFresh(now = Date.now()): T | null {
      if (!entry || now - entry.cachedAt >= ttlMs) return null
      return entry.value
    },
    getStale(): T | null {
      return entry?.value ?? null
    },
    set(value: T, now = Date.now()): void {
      entry = { value, cachedAt: now }
    },
  }
}
