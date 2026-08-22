import { describe, expect, it } from 'vitest'
import { stripUndefined } from './_utils'

describe('stripUndefined', () => {
  it('removes keys whose value is undefined', () => {
    const result = stripUndefined({ a: 1, b: undefined, c: 'x' })

    expect(result).toEqual({ a: 1, c: 'x' })
    expect(Object.keys(result)).not.toContain('b')
  })

  it('preserves null, empty string, 0, false, and empty array', () => {
    const input = { a: null, b: '', c: 0, d: false, e: [] as unknown[] }

    expect(stripUndefined(input)).toEqual({ a: null, b: '', c: 0, d: false, e: [] })
  })

  it('leaves nested objects untouched by reference (shallow strip only)', () => {
    const nested = { deep: undefined, kept: 1 }
    const input = { nested, other: undefined }

    const result = stripUndefined(input)

    expect(result.nested).toBe(nested)
    expect(result).toEqual({ nested })
  })
})
