import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuidanceField } from './GuidanceField'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

function Harness() {
  const [v, setV] = useState('')
  return <GuidanceField value={v} onChange={setV} />
}

describe('GuidanceField', () => {
  it('replaces the text with a preset and marks it pressed', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const box = screen.getByLabelText('visitRequest.guidance')
    await user.type(box, '직접 쓴 말')
    const preset = screen.getByRole('button', { name: 'visitRequest.guidancePreset.ministry' })
    await user.click(preset)
    expect(box).toHaveValue('visitRequest.guidancePreset.ministry')
    expect(preset).toHaveAttribute('aria-pressed', 'true')
  })
})
