import { rowsToCsv } from './scheduleCsv'

describe('rowsToCsv', () => {
  // 엑셀이 UTF-8을 알아보게 하는 BOM. 없으면 한글이 깨진다.
  it('starts with a byte order mark', () => {
    expect(rowsToCsv([['a']]).startsWith('﻿')).toBe(true)
  })

  it('quotes every cell so commas never split a column', () => {
    expect(rowsToCsv([['a,b', 'c']])).toBe('﻿"a,b","c"')
  })

  // RFC4180: 인용부호 안의 인용부호는 두 번 쓴다.
  it('doubles a quote that appears inside a cell', () => {
    expect(rowsToCsv([['say "hi"']])).toBe('﻿"say ""hi"""')
  })

  it('puts each row on its own line', () => {
    expect(rowsToCsv([['a'], ['b']])).toBe('﻿"a"\n"b"')
  })

  it('survives an empty row set', () => {
    expect(rowsToCsv([])).toBe('﻿')
  })
})

// = + - @ 로 시작하거나 탭/CR로 시작하는 셀은 엑셀·시트가 수식으로 실행한다.
// 인용부호로 감싸는 것만으로는 막히지 않는다 — CSV 문법이라 셀 평가 전에 벗겨진다.
// 앞에 작은따옴표를 붙이면 스프레드시트가 강제로 텍스트로 읽는다.
describe('rowsToCsv — formula injection guard', () => {
  it('prefixes a cell starting with "="', () => {
    expect(rowsToCsv([['=1+1']])).toBe('﻿"\'=1+1"')
  })

  it('prefixes a cell starting with "+"', () => {
    expect(rowsToCsv([['+1']])).toBe('﻿"\'+1"')
  })

  it('prefixes a cell starting with "-"', () => {
    expect(rowsToCsv([['-1']])).toBe('﻿"\'-1"')
  })

  it('prefixes a cell starting with "@"', () => {
    expect(rowsToCsv([['@SUM(A1)']])).toBe('﻿"\'@SUM(A1)"')
  })

  it('prefixes a cell starting with a tab', () => {
    expect(rowsToCsv([['\t=1']])).toBe('﻿"\'\t=1"')
  })

  it('prefixes a cell starting with a carriage return', () => {
    expect(rowsToCsv([['\r=1']])).toBe('﻿"\'\r=1"')
  })

  it('leaves an ordinary cell untouched', () => {
    expect(rowsToCsv([['hello']])).toBe('﻿"hello"')
  })

  // 두 보호가 함께 걸린다: 접두사도 붙고, 안의 인용부호도 이중으로 벗어난다.
  it('composes the formula prefix with quote-escaping', () => {
    expect(rowsToCsv([['=say "hi"']])).toBe('﻿"\'=say ""hi"""')
  })
})

// 검사는 trimStart()한 값으로 하지만, 앞에 붙이는 건 원본 값 그대로다 — 셀 내용이
// 원본과 달라지면 안 된다. trimStart()는 U+FEFF(ZWNBSP)도 공백으로 쳐서 걷어내므로
// "앞에 BOM이 붙은 값" 경로도 같은 줄로 막힌다.
describe('rowsToCsv — formula injection guard sees past leading whitespace', () => {
  it('still guards a cell with a leading space before "=", and keeps that space in the output', () => {
    expect(rowsToCsv([[' =1+1']])).toBe('﻿"\' =1+1"')
  })

  it('guards a leading space before "+" (isolates the whitespace-skip from the already-dangerous tab case)', () => {
    expect(rowsToCsv([[' +1']])).toBe('﻿"\' +1"')
  })

  it('guards a cell with a leading U+FEFF before "="', () => {
    expect(rowsToCsv([['﻿=1+1']])).toBe('﻿"\'﻿=1+1"')
  })

  it('leaves a whitespace-only cell unguarded — nothing dangerous follows the whitespace', () => {
    expect(rowsToCsv([['   ']])).toBe('﻿"   "')
  })
})
