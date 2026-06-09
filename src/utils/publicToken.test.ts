import { describe, it, expect } from 'vitest'
import { generatePublicToken } from './publicToken'

describe('generatePublicToken', () => {
  it('returns a string of exactly 16 characters', () => {
    const token = generatePublicToken()
    expect(token).toHaveLength(16)
  })

  it('contains only hex characters [0-9a-f]', () => {
    const token = generatePublicToken()
    expect(token).toMatch(/^[0-9a-f]{16}$/)
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
