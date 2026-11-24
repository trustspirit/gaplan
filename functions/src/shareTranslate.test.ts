import { describe, expect, it, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { sameTokens, toEnglishTokens, translateShareTemplate, TRANSLATE_MODEL } from './shareTranslate'

describe('toEnglishTokens', () => {
  it('renames Korean tokens to their English names and leaves the rest', () => {
    expect(toEnglishTokens('Dear {회장}, {unit} {모름} {링크}')).toBe('Dear {president}, {unit} {모름} {link}')
  })
})

describe('sameTokens', () => {
  it('compares the known tokens regardless of language and order', () => {
    expect(sameTokens('{회장} {링크} {스테이크}', '{unit} {president}\n{link}')).toBe(true)
    expect(sameTokens('{회장} {링크}', '{president}')).toBe(false)
    expect(sameTokens('{일요일} {일요일}', '{dates}')).toBe(false)
  })
})

describe('translateShareTemplate', () => {
  const reply = (english: string) => ({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify({ english }) }],
  })
  const fake = (...replies: object[]) => {
    const create = vi.fn()
    for (const r of replies) create.mockResolvedValueOnce(r)
    return { client: { beta: { messages: { create } } } as unknown as Anthropic, create }
  }

  it('asks the model in the Church style and returns English with English tokens', async () => {
    const { client, create } = fake(reply('Dear {회장},\nPlease recommend a ward in {unit}.\n{link}'))
    await expect(translateShareTemplate(client, '{회장}, 안녕하세요.\n{스테이크}의 와드를 추천해 주세요.\n{링크}')).resolves.toBe(
      'Dear {president},\nPlease recommend a ward in {unit}.\n{link}',
    )
    const params = create.mock.calls[0][0]
    expect(params.model).toBe(TRANSLATE_MODEL)
    expect(params.system).toContain('The Church of Jesus Christ of Latter-day Saints')
    expect(params.fallbacks).toBe('default')
    expect(params.messages[0].content).toContain('{스테이크}의 와드를 추천해 주세요.')
  })

  it('asks once more when a token went missing, then gives up', async () => {
    const { client, create } = fake(reply('Hello.'), reply('Hello, {president}. {link}'))
    await expect(translateShareTemplate(client, '{회장} {링크}')).resolves.toBe('Hello, {president}. {link}')
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[1][0].messages.at(-1).content).toContain('{president}')

    const again = fake(reply('Hello.'), reply('Still nothing.'))
    await expect(translateShareTemplate(again.client, '{회장} {링크}')).rejects.toThrow()
  })

  it('fails on a refusal', async () => {
    const { client } = fake({ stop_reason: 'refusal', content: [] })
    await expect(translateShareTemplate(client, '안녕하세요 {링크}')).rejects.toThrow()
  })
})
