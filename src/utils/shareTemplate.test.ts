import { describe, expect, it } from 'vitest'
import { defaultShareTemplate, renderShareTemplate, SHARE_TOKENS } from './shareTemplate'

const values = {
  title: '2027년 1분기 와드 방문',
  unit: '서울 스테이크',
  seventy: '박경렬',
  dates: '1/17, 3/21',
  due: '12월 31일',
  guidance: '오래 방문받지 못한 와드를 먼저 추천해 주세요.',
  link: 'https://example.test/recommend/r1/t1',
}

describe('renderShareTemplate', () => {
  it('fills every token, in Korean or English', () => {
    expect(renderShareTemplate('{스테이크} 회장님, {일요일} 중에 추천해 주세요. {unit}', values)).toBe(
      '서울 스테이크 회장님, 1/17, 3/21 중에 추천해 주세요. 서울 스테이크\nhttps://example.test/recommend/r1/t1',
    )
  })

  it('adds the link at the end when the template leaves it out', () => {
    expect(renderShareTemplate('추천 부탁드립니다.', values)).toBe('추천 부탁드립니다.\nhttps://example.test/recommend/r1/t1')
  })

  it('keeps the link where the template puts it', () => {
    expect(renderShareTemplate('링크: {링크}\n감사합니다.', values)).toBe(
      '링크: https://example.test/recommend/r1/t1\n감사합니다.',
    )
  })

  it('drops a line whose tokens are all empty', () => {
    expect(renderShareTemplate('추천 부탁드립니다.\n마감: {마감일}\n※ {강조}\n{링크}', { ...values, due: '', guidance: '' })).toBe(
      '추천 부탁드립니다.\nhttps://example.test/recommend/r1/t1',
    )
  })

  it('keeps blank lines the person wrote', () => {
    expect(renderShareTemplate('안녕하세요.\n\n{링크}', values)).toBe('안녕하세요.\n\nhttps://example.test/recommend/r1/t1')
  })

  it('leaves unknown braces alone', () => {
    expect(renderShareTemplate('{모름} {링크}', values)).toBe('{모름} https://example.test/recommend/r1/t1')
  })
})

describe('defaultShareTemplate', () => {
  it('uses only known tokens and includes the link', () => {
    for (const lang of ['ko', 'en'] as const) {
      const tpl = defaultShareTemplate(lang)
      expect(tpl).toContain(lang === 'ko' ? '{링크}' : '{link}')
      const names = [...tpl.matchAll(/\{([^}]+)\}/g)].map((m) => m[1])
      for (const n of names) expect(SHARE_TOKENS.some((tk) => tk.ko === n || tk.en === n)).toBe(true)
    }
  })

  it('reads like the old fixed message when everything is filled', () => {
    expect(renderShareTemplate(defaultShareTemplate('ko'), values)).toBe(
      '[와드 방문 추천 요청] 2027년 1분기 와드 방문 · 서울 스테이크\n' +
        '박경렬 지역 칠십인께서 방문 가능한 일요일(1/17, 3/21)에 서울 스테이크의 와드를 추천해 주세요.\n' +
        '※ 오래 방문받지 못한 와드를 먼저 추천해 주세요.\n' +
        '마감: 12월 31일\n' +
        'https://example.test/recommend/r1/t1',
    )
  })
})
