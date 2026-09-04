import { describe, it, expect } from 'vitest'
import { buildInlineDataScript, INLINE_DATA_ID, MAX_INLINE_BYTES } from './publicInlineScript'

const EMPTY = { schedules: [], generalSchedules: [], scopeDisplayName: null }

describe('buildInlineDataScript', () => {
  it('토큰과 데이터를 함께 싣는다', () => {
    const html = buildInlineDataScript('tok-1', EMPTY)
    expect(html).toContain(`id="${INLINE_DATA_ID}"`)
    expect(html).toContain('application/json')
    const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'))
    expect(JSON.parse(json)).toEqual({ token: 'tok-1', data: EMPTY })
  })

  // 노트에 </script>가 들어 있으면 브라우저가 그 자리에서 문서를 끊는다.
  // JSON.stringify는 <를 그대로 두므로 우리가 이스케이프해야 한다.
  it('닫는 script 태그가 든 노트를 실어도 태그가 조기 종료되지 않는다', () => {
    const payload = {
      ...EMPTY,
      schedules: [{ id: 's1', notes: 'watch </script><img src=x onerror=alert(1)>' }],
    } as never
    const html = buildInlineDataScript('tok-1', payload)
    const body = html.slice(0, html.lastIndexOf('</script>'))
    expect(body).not.toContain('</script>')
    expect(html).toContain('\\u003c/script')
    const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'))
    expect(JSON.parse(json).data.schedules[0].notes).toBe(
      'watch </script><img src=x onerror=alert(1)>',
    )
  })

  it('상한을 넘는 페이로드는 심지 않는다 — HTML이 무거워져 이득이 뒤집히는 걸 막는다', () => {
    const big = {
      ...EMPTY,
      scopeDisplayName: 'x'.repeat(MAX_INLINE_BYTES + 1),
    }
    expect(buildInlineDataScript('tok-1', big)).toBe('')
  })
})
