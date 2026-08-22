import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { getScopeUnitIds, getScopeDisplayName, getScopeRegionId } from './regions'
import { isCcCouncilForScope } from './ccCouncil'
import { buildScheduleTitle } from './scheduleTitle'
import { generalScheduleInScope } from './generalScheduleScope'
import { buildGeneralScheduleVEvent } from './generalScheduleIcsEvent'

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

      // Resolve token, global flag, and per-unit flags in parallel
      const [tokensSnap, settingsSnap, unitsSnap] = await Promise.all([
        admin.firestore().doc('settings/publicTokens').get(),
        admin.firestore().doc('settings/public').get(),
        admin.firestore().doc('settings/publicUnits').get(),
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
      // 행사 스코프 판정은 유닛 링크에서도 그 유닛의 CC 기준으로 해야 한다.
      let scopeRegionId: string | null = null

      if (scopeValue !== '__all__') {
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
        scopeRegionId = getScopeRegionId(scopeValue)
      }

      // Date cutoff: 7 days ago — same window as the web view
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 7)
      const cutoffStr = cutoff.toISOString().split('T')[0]

      // Regional scopes query with unitId 'in' (≤6 units per CCM region, Firestore
      // limit 30) backed by the (unitId, status, date) composite index; the
      // stake-wide scope reads everything via the (status, date) index.
      let schedulesQuery = admin.firestore()
        .collection('schedules') as admin.firestore.Query
      if (unitIds !== null) schedulesQuery = schedulesQuery.where('unitId', 'in', unitIds)

      // 협의 평의회는 CC 전체가 대상이라 unitId가 비어 있다. unitId-in 쿼리로는 못 잡으니
      // regionId로 별도 조회해 합친다. (전체 공유는 이미 전 일정을 읽어 자동 포함)
      const ccQuery =
        unitIds !== null
          ? admin.firestore().collection('schedules')
              .where('regionId', '==', scopeValue)
              .where('status', '==', 'confirmed')
              .where('date', '>=', cutoffStr)
              .orderBy('date', 'asc')
              .get()
          : null

      const [schedulesSnap, ccSnap, generalSnap] = await Promise.all([
        schedulesQuery
          .where('status', '==', 'confirmed')
          .where('date', '>=', cutoffStr)
          .orderBy('date', 'asc')
          .get(),
        ccQuery,
        admin.firestore()
          .collection('generalSchedules')
          .where('isPublic', '==', true)
          .where('date', '>=', cutoffStr)
          .orderBy('date', 'asc')
          .get(),
      ])

      const unitSet = unitIds !== null ? new Set(unitIds) : null

      const seenIds = new Set<string>()
      const scheduleDocs = [...schedulesSnap.docs, ...(ccSnap?.docs ?? [])]
        .filter((d) => {
          if (seenIds.has(d.id)) return false
          seenIds.add(d.id)
          return true
        })
        .sort((a, b) => (a.data().date as string).localeCompare(b.data().date as string))

      const dtstamp = nowDtStamp()
      const events: string[] = []

      scheduleDocs.filter(d => {
        // Regional shares expose ward visits only — 단, 그 CC의 협의 평의회는 함께 노출한다
        return unitSet === null || d.data().type === 'ward_visit' || isCcCouncilForScope(d.data(), scopeValue)
      }).forEach((d) => {
        const data = d.data()
        const summary = buildScheduleTitle({
          type: data.type,
          unitId: data.unitId,
          regionId: data.regionId,
          targetKind: data.targetKind,
          wardName: data.wardName,
          customTitle: data.customTitle,
        })
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
        const place = typeof data.location === 'string' ? data.location.trim() : ''
        if (place) lines.push(`LOCATION:${escape(place)}`)
        const descParts: string[] = []
        // 동행 정보는 전체 공유에서만 노출 — CCM 지역별 공유에는 포함하지 않음
        if (unitSet === null && data.presidentAccompanied === true) descParts.push('스테이크 회장 동행')
        if (data.notes) descParts.push(data.notes)
        if (descParts.length > 0) lines.push(`DESCRIPTION:${escape(descParts.join('\n'))}`)
        const zoomUrl = safeUrl(data.zoomLink)
        if (zoomUrl) lines.push(`URL:${zoomUrl}`)
        lines.push('END:VEVENT')
        events.push(lines.join('\r\n'))
      })

      // 행사(generalSchedules)도 같은 스코프 규칙(generalScheduleInScope)으로 걸러 VEVENT로 싣는다.
      // getPublicSchedules.ts의 웹 뷰와 이 ICS 피드가 서로 다른 행사 목록을 보여주면 안 된다.
      generalSnap.docs
        .filter((d) => generalScheduleInScope(d.data(), scopeRegionId, unitIds))
        .forEach((d) => {
          const data = d.data()
          events.push(buildGeneralScheduleVEvent({
            id: d.id,
            title: data.title,
            date: data.date,
            endDate: data.endDate,
            startTime: data.startTime,
            endTime: data.endTime,
          }, dtstamp))
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
