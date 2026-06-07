export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export const TIME_RE = /^\d{2}:\d{2}$/

export function isValidUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl.trim())
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.length > 2
  } catch {
    return false
  }
}
