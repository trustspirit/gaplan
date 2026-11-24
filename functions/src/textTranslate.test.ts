import { describe, expect, it, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { translateTexts } from './textTranslate'

const fake = (english: unknown, stop = 'end_turn') => {
  const create = vi.fn().mockResolvedValue({
    stop_reason: stop,
    content: [{ type: 'text', text: JSON.stringify({ english }) }],
  })
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create }
}

describe('translateTexts', () => {
  it('pairs each Korean label with its English, in order', async () => {
    const { client, create } = fake(['U.S. Military District Conference', 'Seoul CC'])
    await expect(translateTexts(client, ['미군 지방부 대회', '서울 CC'])).resolves.toEqual({
      '미군 지방부 대회': 'U.S. Military District Conference',
      '서울 CC': 'Seoul CC',
    })
    expect(JSON.parse(create.mock.calls[0][0].messages[0].content)).toEqual(['미군 지방부 대회', '서울 CC'])
  })

  it('asks nothing for nothing, and fails when the count does not match', async () => {
    const { client, create } = fake([])
    await expect(translateTexts(client, [])).resolves.toEqual({})
    expect(create).not.toHaveBeenCalled()
    await expect(translateTexts(fake(['one']).client, ['가', '나'])).rejects.toThrow()
  })
})
