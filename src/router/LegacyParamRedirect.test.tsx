import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LegacyParamRedirect } from './LegacyParamRedirect'

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/admin/visit-plans/:planId"
          element={<LegacyParamRedirect to="/plans/visit-plans/:planId" />}
        />
        <Route path="/plans/visit-plans/:planId" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  )
}

function Landed() {
  return <div data-testid="landed" />
}

describe('LegacyParamRedirect', () => {
  it('carries the param over to the new path', () => {
    renderAt('/admin/visit-plans/abc123')
    expect(screen.getByTestId('landed')).toBeInTheDocument()
  })

  // 값에 URL 예약문자가 들어와도 경로가 쪼개지지 않아야 한다. Firestore id는
  // 영숫자지만, 여기로 들어오는 값은 결국 남이 붙여넣은 URL이다.
  it('escapes a param value that would otherwise split the path', () => {
    render(
      <MemoryRouter initialEntries={['/admin/visit-plans/a%2Fb']}>
        <Routes>
          <Route
            path="/admin/visit-plans/:planId"
            element={<LegacyParamRedirect to="/plans/visit-plans/:planId" />}
          />
          <Route path="/plans/visit-plans/:planId" element={<Landed />} />
          <Route path="*" element={<div data-testid="lost" />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('landed')).toBeInTheDocument()
  })
})
