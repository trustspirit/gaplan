import { describe, expect, it } from 'vitest'
import { defaultShareTemplate, renderShareTemplate, SHARE_TOKENS } from './shareTemplate'

const values = {
  title: '2027년 1분기 와드 방문',
  unit: '서울 스테이크',
  president: '홍길동 회장님',
  seventy: '박경렬',
  dates: '1/17, 3/21',
  due: '12월 31일',
  guidance: '오래 방문받지 못한 와드를 먼저 추천해 주세요.',
  link: 'https://example.test/recommend/r1/t1',
}

describe('renderShareTemplate', () => {
  it('fills every token, in Korean or English', () => {
    expect(renderShareTemplate('{회장}, {일요일} 중에 추천해 주세요. {unit} {president}', values)).toBe(
      '홍길동 회장님, 1/17, 3/21 중에 추천해 주세요. 서울 스테이크 홍길동 회장님\nhttps://example.test/recommend/r1/t1',
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

  it('greets the president and fills everything in Korean', () => {
    expect(renderShareTemplate(defaultShareTemplate('ko'), values)).toBe(
      '[와드 방문 추천 요청] 2027년 1분기 와드 방문\n' +
        '홍길동 회장님, 안녕하세요.\n' +
        '박경렬 지역 칠십인께서 방문 가능한 일요일(1/17, 3/21)에 서울 스테이크의 와드를 추천해 주시기 바랍니다.\n' +
        '※ 오래 방문받지 못한 와드를 먼저 추천해 주세요.\n' +
        '마감: 12월 31일\n' +
        'https://example.test/recommend/r1/t1',
    )
  })

  it('has an English message too', () => {
    const en = renderShareTemplate(defaultShareTemplate('en'), {
      ...values, unit: 'Seoul Stake', president: 'President Hong', due: 'Dec 31', guidance: '',
    })
    expect(en).toBe(
      '[Ward visit recommendations] 2027년 1분기 와드 방문\n' +
        'Dear President Hong,\n' +
        'Please recommend a ward in Seoul Stake for the Sundays Area Seventy 박경렬 is available (1/17, 3/21).\n' +
        'Due: Dec 31\n' +
        'https://example.test/recommend/r1/t1',
    )
  })
})

describe('presidentLabel', () => {
  it('names the president in each language, or just the title', async () => {
    const { presidentLabel } = await import('./shareTemplate')
    expect(presidentLabel('홍길동', 'ko')).toBe('홍길동 회장님')
    expect(presidentLabel('홍길동', 'en')).toBe('President 홍길동')
    expect(presidentLabel(undefined, 'ko')).toBe('회장님')
    expect(presidentLabel('  ', 'en')).toBe('President')
  })
})

describe('linkFor', () => {
  it('opens the page in English for an English stake', async () => {
    const { linkFor } = await import('./shareTemplate')
    expect(linkFor('https://x.test/recommend/r1/t', 'en')).toBe('https://x.test/recommend/r1/t?lang=en')
    expect(linkFor('https://x.test/recommend/r1/t', 'ko')).toBe('https://x.test/recommend/r1/t')
  })
})
