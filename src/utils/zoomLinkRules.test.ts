import { isHttpUrl, validateNewZoomLink, MAX_ZOOM_LINKS, type ZoomLink } from './zoomLinkRules'

describe('isHttpUrl', () => {
  it('accepts an https zoom link', () => {
    expect(isHttpUrl('https://zoom.us/j/1234567890')).toBe(true)
  })

  it('accepts a plain http link', () => {
    expect(isHttpUrl('http://example.com/meeting')).toBe(true)
  })

  it('rejects a non-http(s) scheme', () => {
    expect(isHttpUrl('zoommtg://zoom.us/join?confno=123')).toBe(false)
  })

  it('rejects text that is not a URL at all', () => {
    expect(isHttpUrl('그냥 텍스트')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isHttpUrl('')).toBe(false)
  })

  it('tolerates surrounding whitespace', () => {
    expect(isHttpUrl('  https://zoom.us/j/1234567890  ')).toBe(true)
  })
})

function link(url: string, label = '라벨'): ZoomLink {
  return { id: url, label, url }
}

describe('validateNewZoomLink', () => {
  it('accepts a fresh, valid link under the limit', () => {
    const result = validateNewZoomLink([], { label: '서울동 스테이크 정기 모임', url: 'https://zoom.us/j/111' })
    expect(result).toEqual({ ok: true })
  })

  it('rejects a URL that is not http(s)', () => {
    const result = validateNewZoomLink([], { label: '라벨', url: 'zoommtg://zoom.us/join' })
    expect(result).toEqual({ ok: false, reason: 'invalid_url' })
  })

  it('rejects a duplicate URL, comparing trimmed values', () => {
    const existing = [link('https://zoom.us/j/111')]
    const result = validateNewZoomLink(existing, { label: '다른 라벨', url: '  https://zoom.us/j/111  ' })
    expect(result).toEqual({ ok: false, reason: 'duplicate' })
  })

  it('rejects an empty label', () => {
    const result = validateNewZoomLink([], { label: '   ', url: 'https://zoom.us/j/222' })
    expect(result).toEqual({ ok: false, reason: 'empty_label' })
  })

  it('rejects adding a link once already at the max', () => {
    const existing = Array.from({ length: MAX_ZOOM_LINKS }, (_, i) => link(`https://zoom.us/j/${i}`))
    const result = validateNewZoomLink(existing, { label: '새 라벨', url: 'https://zoom.us/j/new' })
    expect(result).toEqual({ ok: false, reason: 'limit_reached' })
  })

  it('checks the URL before the label, so an invalid URL wins over an empty label', () => {
    const result = validateNewZoomLink([], { label: '', url: 'not-a-url' })
    expect(result).toEqual({ ok: false, reason: 'invalid_url' })
  })
})
