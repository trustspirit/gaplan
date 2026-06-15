import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { getScopeDisplayName } from './regions'

const HOSTING_URL = 'https://gaplan-fccfe.web.app'

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

export const publicScheduleRenderer = onRequest(
  { region: 'asia-northeast3' },
  async (req, res) => {
    const token = req.path.split('/').filter(Boolean).pop() ?? ''

    let title = 'GA Plan 일정'

    if (token) {
      try {
        const tokensSnap = await admin.firestore().doc('settings/publicTokens').get()
        const scopeValue: string | undefined = tokensSnap.exists ? tokensSnap.data()?.[token] : undefined
        if (scopeValue && scopeValue !== '__all__') {
          const name = getScopeDisplayName(scopeValue)
          if (name) title = `${name} 일정`
        }
      } catch {
        // fallback to generic title
      }
    }

    const pageUrl = `${HOSTING_URL}/public/schedule/${token}`

    let indexHtml: string
    try {
      const r = await fetch(`${HOSTING_URL}/`, { signal: AbortSignal.timeout(5000) })
      indexHtml = await r.text()
    } catch {
      indexHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><title>${escapeAttr(title)}</title></head><body><div id="root"></div></body></html>`
    }

    const html = indexHtml
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(title)}</title>`)
      .replace(/<meta property="og:title"[^>]*\/?>/, `<meta property="og:title" content="${escapeAttr(title)}" />`)
      .replace(/<meta property="og:url"[^>]*\/?>/, `<meta property="og:url" content="${escapeAttr(pageUrl)}" />`)

    res.set('Content-Type', 'text/html; charset=utf-8')
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300')
    res.send(html)
  },
)
