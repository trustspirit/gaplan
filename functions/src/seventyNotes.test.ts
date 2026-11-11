import { describe, it, expect } from 'vitest'
import { isValidSeventyNotesInput, normalizeSeventyNotes, SEVENTY_NOTES_MAX_LENGTH } from './seventyNotes'

describe('normalizeSeventyNotes', () => {
  it('앞뒤 공백을 걷어낸다', () => {
    expect(normalizeSeventyNotes('  면담 전 확인  ')).toBe('면담 전 확인')
  })

  it('비어 있거나 공백뿐이면 null이다 — 메모 없음', () => {
    expect(normalizeSeventyNotes('')).toBeNull()
    expect(normalizeSeventyNotes('   ')).toBeNull()
    expect(normalizeSeventyNotes(null)).toBeNull()
    expect(normalizeSeventyNotes(undefined)).toBeNull()
  })
})

describe('isValidSeventyNotesInput', () => {
  it('문자열과 null(지움)을 받는다', () => {
    expect(isValidSeventyNotesInput('메모')).toBe(true)
    expect(isValidSeventyNotesInput(null)).toBe(true)
  })

  it('길이 제한을 넘거나 문자열이 아니면 거부한다', () => {
    expect(isValidSeventyNotesInput('가'.repeat(SEVENTY_NOTES_MAX_LENGTH))).toBe(true)
    expect(isValidSeventyNotesInput('가'.repeat(SEVENTY_NOTES_MAX_LENGTH + 1))).toBe(false)
    expect(isValidSeventyNotesInput(123)).toBe(false)
    expect(isValidSeventyNotesInput(undefined)).toBe(false)
  })
})
