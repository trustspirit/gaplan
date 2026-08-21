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
