import { ROUTES, LEGACY_REDIRECTS } from './routes'

describe('ROUTES', () => {
  it('names the landing route home, not dashboard', () => {
    expect(ROUTES.home).toBe('/home')
  })

  it('never repeats a path under two names', () => {
    const paths = Object.values(ROUTES)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('LEGACY_REDIRECTS', () => {
  // 라우터는 한 번만 튕긴다. A→B→C가 있으면 A로 들어온 사람은 B에서 멈춘다.
  it('never points at a path that is itself redirected', () => {
    for (const [from, to] of Object.entries(LEGACY_REDIRECTS)) {
      expect(LEGACY_REDIRECTS[to], `${from} -> ${to} -> …`).toBeUndefined()
    }
  })

  it('only sends people to a path the app actually serves', () => {
    const served = new Set<string>(Object.values(ROUTES))
    for (const to of Object.values(LEGACY_REDIRECTS)) {
      expect(served, `redirect target ${to}`).toContain(to)
    }
  })

  it('keeps the old landing path working', () => {
    expect(LEGACY_REDIRECTS['/dashboard']).toBe(ROUTES.home)
  })
})
