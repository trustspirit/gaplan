import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const tokens = readFileSync(resolve(__dirname, '_tokens.scss'), 'utf8')
const variables = readFileSync(resolve(__dirname, '_variables.scss'), 'utf8')

const REQUIRED = [
  '--surface', '--surface-sunken', '--border', '--border-strong',
  '--text', '--text-muted', '--text-subtle',
  '--accent', '--accent-hover', '--accent-weak', '--accent-border',
  '--danger', '--danger-weak', '--warning', '--warning-weak',
  '--success', '--success-weak',
  '--sidebar', '--sidebar-active', '--sidebar-text',
  '--color-primary',
]

describe('design tokens', () => {
  it('declares every semantic token in :root', () => {
    for (const name of REQUIRED) {
      expect(tokens).toContain(`${name}:`)
    }
  })

  // 값을 두 곳에 적으면 드리프트가 생긴다. _tokens.scss는 _variables.scss의
  // 값을 보간해서만 쓴다.
  it('never writes a raw hex value of its own', () => {
    expect(tokens).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  // SCSS 변수를 var()로 바꾸면 rgba($token, α) 39곳과
  // color.adjust($token, …) 5곳이 컴파일 에러가 된다.
  it('keeps SCSS color variables as compile-time literals', () => {
    const colorLines = variables
      .split('\n')
      .filter((line) => /^\$color-[a-z-]+:/.test(line))
    expect(colorLines.length).toBeGreaterThan(10)
    for (const line of colorLines) {
      expect(line).not.toContain('var(--')
    }
  })
})
