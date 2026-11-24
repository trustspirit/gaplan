import { describe, expect, it, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import {
  englishForPage, englishIsCurrent, englishSource, presidentsOfUnits, translateRequestTexts,
} from './requestEnglish'

const source = englishSource(
  { title: '2027년 1분기 와드 방문', guidance: '성역이 필요한 와드를 우선해 주세요.', seventyName: '박경렬' },
  { u1: '하태완' },
)

describe('presidentsOfUnits', () => {
  it('takes the stake or district president of each unit by its Korean name', () => {
    const leaders = [
      { unitNameKo: '서울 스테이크', role: '감독', name: '김감독' },
      { unitNameKo: '서울 스테이크', role: '스테이크 회장', name: '하태완' },
      { unitNameKo: '강릉 지방부', role: '지방부 회장', name: '이지방' },
    ]
    expect(presidentsOfUnits(
      [{ id: 'u1', ko: '서울 스테이크' }, { id: 'u2', ko: '강릉 지방부' }, { id: 'u3', ko: '없는 스테이크' }],
      leaders,
    )).toEqual({ u1: '하태완', u2: '이지방' })
  })
})

describe('englishIsCurrent / englishForPage', () => {
  const english = { title: 'Ward Visits', guidance: 'Please…', seventy: 'Park Kyungryeol', presidents: { u1: 'Ha Taewan' }, source }

  it('is current only while every Korean value is the same', () => {
    expect(englishIsCurrent(english, source)).toBe(true)
    expect(englishIsCurrent(english, { ...source, presidents: { u1: '하태완', u2: '이지방' } })).toBe(false)
    expect(englishIsCurrent(english, { ...source, title: '다른 제목' })).toBe(false)
    expect(englishIsCurrent(undefined, source)).toBe(false)
  })

  it('gives the page its texts while the title, guidance and seventy are unchanged', () => {
    const req = { title: source.title, guidance: source.guidance, seventyName: '박경렬' }
    expect(englishForPage(english, req)).toEqual({ title: 'Ward Visits', guidance: 'Please…', seventy: 'Park Kyungryeol' })
    expect(englishForPage(english, { ...req, guidance: '바뀜' })).toBeNull()
    expect(englishForPage(null, req)).toBeNull()
  })
})

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
      title: 'Ward Visits, First Quarter 2027', guidance: 'Please give priority to…', seventy: 'Park Kyungryeol',
      presidents: [{ id: 'u1', name: 'Ha Taewan' }],
    })
    await expect(translateRequestTexts(client, source)).resolves.toEqual({
      title: 'Ward Visits, First Quarter 2027', guidance: 'Please give priority to…', seventy: 'Park Kyungryeol',
      presidents: { u1: 'Ha Taewan' },
    })
    const params = create.mock.calls[0][0]
    expect(params.system).toContain('Revised Romanization')
    expect(JSON.parse(params.messages[0].content).presidents).toEqual([{ id: 'u1', name: '하태완' }])
  })

  it('keeps an empty Korean field empty', async () => {
    const { client } = fake({ title: 'T', guidance: 'Made up', seventy: 'P', presidents: [{ id: 'u1', name: 'H' }] })
    await expect(translateRequestTexts(client, { ...source, guidance: '' })).resolves.toMatchObject({ guidance: '' })
  })

  it('fails when a president is missing or the model refuses', async () => {
    await expect(translateRequestTexts(fake({ title: 'T', guidance: 'G', seventy: 'P', presidents: [] }).client, source))
      .rejects.toThrow()
    await expect(translateRequestTexts(fake(null, 'refusal').client, source)).rejects.toThrow()
  })
})
