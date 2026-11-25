import { describe, expect, it } from 'vitest'
import { recommendParams } from './params'

describe('recommendParams', () => {
  it('reads the request id and token', () => {
    expect(recommendParams('/recommend/r1/abc123')).toEqual({ requestId: 'r1', token: 'abc123' })
    expect(recommendParams('/recommend/r1/abc123/')).toEqual({ requestId: 'r1', token: 'abc123' })
  })

  it('returns nothing for other paths', () => {
    expect(recommendParams('/recommend/r1')).toEqual({})
    expect(recommendParams('/recommend/r1/t/extra')).toEqual({})
    expect(recommendParams('/plans')).toEqual({})
  })
})
