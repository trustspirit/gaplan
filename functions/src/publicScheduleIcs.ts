import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { getScopeUnitIds, getScopeDisplayName } from './regions'

function pad(n: number) { return String(n).padStart(2, '0') }

function toIcsDateTime(date: string, time: string): string {
  // date: "YYYY-MM-DD", time: "HH:MM" → "YYYYMMDDTHHMMSS"
  const [y, mo, d] = date.split('-')
  const [h, mi] = time.split(':')
  return `${y}${mo}${d}T${h}${mi}00`
}

function nowDtStamp(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const mo = pad(now.getUTCMonth() + 1)
  const d = pad(now.getUTCDate())
  const h = pad(now.getUTCHours())
  const mi = pad(now.getUTCMinutes())
  const s = pad(now.getUTCSeconds())
  return `${y}${mo}${d}T${h}${mi}${s}Z`
}

function escape(str: string): string {
  return str.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
}

function safeUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const stripped = url.replace(/[\r\n]/g, '')
  return /^https?:\/\//i.test(stripped) ? stripped : null
}

function buildSummary(data: admin.firestore.DocumentData, unitName: string): string {
  if (data.customTitle) return data.customTitle as string
  const typeLabel = data.type === 'ward_visit' ? '와드 방문' : data.type === 'interview' ? '접견' : '모임'
  const ward = data.wardName ? ` · ${data.wardName}` : ''
  return `${typeLabel} - ${unitName}${ward}`
}

export const publicScheduleIcs = functions
  .region('asia-northeast3')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .https.onRequest(async (req: functions.https.Request, res: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    try {
      const token = req.query.token
      if (!token || typeof token !== 'string') {
        res.setHeader('Cache-Control', 'no-store')
        res.status(403).send('token required')
        return
      }

      // Resolve token and global flag in parallel
      const [tokensSnap, settingsSnap] = await Promise.all([
        admin.firestore().doc('settings/publicTokens').get(),
        admin.firestore().doc('settings/public').get(),
      ])

      const scopeValue: string | undefined = tokensSnap.exists ? tokensSnap.data()?.[token] : undefined
      if (!scopeValue) {
        res.setHeader('Cache-Control', 'no-store')
        res.status(403).send('Invalid token')
        return
      }

      const globalEnabled = settingsSnap.exists && settingsSnap.data()?.schedulePublic === true
      if (!globalEnabled) {
        res.setHeader('Cache-Control', 'no-store')
        res.status(403).send('Public schedule is not enabled')
        return
      }

      let unitIds: string[] | null = null
      let calName = '일정표'

      if (scopeValue !== '__all__') {
        const unitsSnap = await admin.firestore().doc('settings/publicUnits').get()
        const unitEnabled = unitsSnap.exists && unitsSnap.data()?.[scopeValue]?.enabled === true
        if (!unitEnabled) {
          res.setHeader('Cache-Control', 'no-store')
          res.status(403).send('This scope is not enabled')
          return
        }
        unitIds = getScopeUnitIds(scopeValue)
        if (unitIds.length === 0) {
          res.setHeader('Cache-Control', 'no-store')
          res.status(403).send('Invalid scope')
          return
        }
        calName = getScopeDisplayName(scopeValue) || '일정표'
      }

      // Date cutoff: 7 days ago — same window as the web view
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 7)
      const cutoffStr = cutoff.toISOString().split('T')[0]

      // Query using (status, date) index; filter unitId in code
      const [schedulesSnap, unitsSnap2] = await Promise.all([
        admin.firestore()
          .collection('schedules')
          .where('status', '==', 'confirmed')
          .where('date', '>=', cutoffStr)
          .orderBy('date', 'asc')
          .get(),
        admin.firestore().collection('units').get(),
      ])

      const unitSet = unitIds !== null ? new Set(unitIds) : null

      const unitMap: Record<string, string> = {}
      unitsSnap2.docs.forEach((d) => { unitMap[d.id] = d.data().name ?? d.id })

      const dtstamp = nowDtStamp()
      const events: string[] = []

      schedulesSnap.docs.filter(d => {
        const sd = d.data()
        return unitSet === null || unitSet.has(sd.unitId)
      }).forEach((d) => {
        const data = d.data()
        const unitName = unitMap[data.unitId] ?? data.unitId ?? ''
        const summary = buildSummary(data, unitName)
        const dtstart = toIcsDateTime(data.date, data.startTime)
        const dtend = toIcsDateTime(data.date, data.endTime)

        const lines = [
          'BEGIN:VEVENT',
          `UID:${d.id}@gaplan`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART;TZID=Asia/Seoul:${dtstart}`,
          `DTEND;TZID=Asia/Seoul:${dtend}`,
          `SUMMARY:${escape(summary)}`,
        ]
        if (data.notes) lines.push(`DESCRIPTION:${escape(data.notes)}`)
        const zoomUrl = safeUrl(data.zoomLink)
        if (zoomUrl) lines.push(`URL:${zoomUrl}`)
        lines.push('END:VEVENT')
        events.push(lines.join('\r\n'))
      })

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Gaplan//Schedule//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${calName}`,
        'X-WR-TIMEZONE:Asia/Seoul',
        'BEGIN:VTIMEZONE',
        'TZID:Asia/Seoul',
        'BEGIN:STANDARD',
        'DTSTART:19700101T000000',
        'TZOFFSETFROM:+0900',
        'TZOFFSETTO:+0900',
        'TZNAME:KST',
        'END:STANDARD',
        'END:VTIMEZONE',
        ...events,
        'END:VCALENDAR',
      ].join('\r\n')

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="schedule.ics"')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.status(200).send(ics)
    } catch (err) {
      console.error('publicScheduleIcs error:', err)
      res.status(500).send('Internal error')
    }
  })
