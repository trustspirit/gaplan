import { describe, expect, it, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { englishSource } from './requestEnglish'
import { translateRequestTexts } from './requestTranslate'

const source = englishSource(
  { title: '2027년 1분기 와드 방문', guidance: '성역이 필요한 와드를 우선해 주세요.', note: '감사합니다.', seventyName: '박경렬' },
  { u1: '하태완' },
)

describe('translateRequestTexts', () => {
  const fake = (out: object | null, stop = 'end_turn') => {
    const create = vi.fn().mockResolvedValue({
      stop_reason: stop,
      content: out ? [{ type: 'text', text: JSON.stringify(out) }] : [],
    })
    return { client: { beta: { messages: { create } } } as unknown as Anthropic, create }
  }

  it('returns the English values keyed like the Korean ones', async () => {
    const { client, create } = fake({
      title: 'Ward Visits, First Quarter 2027', guidance: 'Please give priority to…', note: 'Thank you.',
      seventy: 'Park Kyungryeol', presidents: [{ id: 'u1', name: 'Ha Taewan' }],
    })
    await expect(translateRequestTexts(client, source)).resolves.toEqual({
      title: 'Ward Visits, First Quarter 2027', guidance: 'Please give priority to…', note: 'Thank you.',
      seventy: 'Park Kyungryeol', presidents: { u1: 'Ha Taewan' },
    })
    const params = create.mock.calls[0][0]
    expect(params.system).toContain('Revised Romanization')
    expect(JSON.parse(params.messages[0].content).presidents).toEqual([{ id: 'u1', name: '하태완' }])
  })

  it('keeps an empty Korean field empty', async () => {
    const { client } = fake({ title: 'T', guidance: 'Made up', note: '', seventy: 'P', presidents: [{ id: 'u1', name: 'H' }] })
    await expect(translateRequestTexts(client, { ...source, guidance: '' })).resolves.toMatchObject({ guidance: '' })
  })

  it('fails when a president is missing or the model refuses', async () => {
    await expect(translateRequestTexts(fake({ title: 'T', guidance: 'G', note: 'N', seventy: 'P', presidents: [] }).client, source))
      .rejects.toThrow()
    await expect(translateRequestTexts(fake(null, 'refusal').client, source)).rejects.toThrow()
  })
})
