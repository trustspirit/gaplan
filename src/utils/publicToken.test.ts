import { describe, it, expect } from 'vitest'
import { generatePublicToken } from './publicToken'

describe('generatePublicToken', () => {
  it('returns a string of exactly 8 characters', () => {
    const token = generatePublicToken()
    expect(token).toHaveLength(8)
  })

  it('contains only alphanumeric characters [0-9a-z]', () => {
    const token = generatePublicToken()
    expect(token).toMatch(/^[0-9a-z]{8}$/)
  })

  it('returns different values on consecutive calls', () => {
    const tokens = Array.from({ length: 20 }, () => generatePublicToken())
    // Check that not all tokens are the same (at least some variation exists)
    const uniqueTokens = new Set(tokens)
    expect(uniqueTokens.size).toBeGreaterThan(1)
  })

  it('never returns an empty string', () => {
    const token = generatePublicToken()
    expect(token).not.toBe('')
    expect(token.length).toBeGreaterThan(0)
  })
})
