import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 리마인더는 상단바 종(RemindersBell) 하나로만 말한다.
 *
 * 홈에 요약 배너를 하나 더 두면 같은 목록이 두 표면에서 서로 다른 시점에
 * 열리고, 한쪽에서 지운 항목이 다른 쪽에는 남은 것처럼 보인다. 종은 대상
 * 역할이면 건수와 무관하게 항상 떠 있으므로 배너가 없어도 잃는 정보가 없다.
 * 표면을 하나로 고정하는 이 규칙을 화면 코드 전체에 건다.
 */
const PAGES_ROOT = resolve(__dirname, '..')

function pageSources(): string[] {
  return readdirSync(PAGES_ROOT, { recursive: true, encoding: 'utf8' }).filter(
    (name) => /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name),
  )
}

describe('reminder surfaces', () => {
  it('finds the page sources it is meant to guard', () => {
    expect(pageSources().length).toBeGreaterThan(10)
  })

  it('leaves reminders to the top bar bell', () => {
    const offenders = pageSources().filter((name) =>
      /domain\/Reminders/.test(readFileSync(resolve(PAGES_ROOT, name), 'utf8')),
    )
    expect(offenders, `화면이 두 번째 리마인더 표면을 들고 있다: ${offenders.join(', ')}`).toEqual(
      [],
    )
  })
})
