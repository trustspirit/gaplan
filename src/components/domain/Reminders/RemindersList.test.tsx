import { describe, it, expect } from 'vitest'
import { sortBySeverity } from './RemindersList'

describe('sortBySeverity', () => {
  it('red → amber → green 순으로 정렬', () => {
    const out = sortBySeverity([
      { severity: 'green' }, { severity: 'red' }, { severity: 'amber' },
    ] as never[])
    expect(out.map(x => (x as { severity: string }).severity)).toEqual(['red', 'amber', 'green'])
  })
})
