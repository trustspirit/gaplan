import { type Request, onRequest } from 'firebase-functions/v2/https'
import { PUBLIC_HTTP_OPTS } from './fnOptions'
import * as admin from 'firebase-admin'
import {
  PublicScopeError,
  resolvePublicScope,
  schedulesBaseQuery,
  type FirestoreLike,
  type PublicScope,
} from './publicSchedulePayload'
import { icsScopeErrorMessage } from './publicScheduleIcsScope'
import { isCcCouncilForScope } from './ccCouncil'
import { buildScheduleTitle } from './scheduleTitle'
import { generalScheduleInScope } from './generalScheduleScope'
import { buildGeneralScheduleVEvent } from './generalScheduleIcsEvent'
import { dedupeById, isSeventyOnly } from './seventyOnly'
import { allDayExclusiveEndDate, isAllDaySchedule, scheduleLastDate } from './scheduleDates'
import { GENERAL_SEVENTY_NOTES_COLLECTION, SEVENTY_NOTES_COLLECTION } from './seventyNotes'
import { withSeventyAttendsLine } from './generalScheduleEventBody'
import { PUBLIC_MAX_INSTANCES } from './publicLimits'

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

export const publicScheduleIcs = onRequest(
  { ...PUBLIC_HTTP_OPTS, maxInstances: PUBLIC_MAX_INSTANCES },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (req: Request, res: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*')

    try {
      const token = req.query.token
      if (!token || typeof token !== 'string') {
        res.setHeader('Cache-Control', 'no-store')
        res.status(403).send('token required')
        return
      }

      // 토큰·전역 스위치·링크별 켜짐 판정은 웹 화면과 같은 함수를 쓴다(칠십인 개인 링크 포함).
      // 따로 복사해 두면 한쪽만 새 범위를 알게 되고, 그 링크의 구독이 끊긴다.
      const db = admin.firestore() as unknown as FirestoreLike
      let scope: PublicScope
      try {
        scope = await resolvePublicScope(db, token)
      } catch (e) {
        if (e instanceof PublicScopeError) {
          res.setHeader('Cache-Control', 'no-store')
          res.status(403).send(icsScopeErrorMessage(e.reason))
          return
        }
        throw e
      }
      const { scopeValue, unitIds, scopeRegionId } = scope
      const calName = scope.scopeDisplayName ?? '일정표'

      // Date cutoff: 7 days ago — same window as the web view
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 7)
      const cutoffStr = cutoff.toISOString().split('T')[0]

      // Regional scopes query with unitId 'in' (≤6 units per CCM region, Firestore
      // limit 30) backed by the (unitId, status, date) composite index; the
      // stake-wide scope reads everything via the (status, date) index.
      const schedulesQuery = schedulesBaseQuery(db, scope)

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

      // 칠십인 전용 행사는 isPublic이 false라 아래 isPublic 쿼리에 걸리지 않는다. 전체 공유
      // (칠십인 전용 페이지)의 구독에서만 한 번 더 조회해 합친다 — publicSchedulePayload와 같은 규칙.
      const seventyOnlyQuery =
        unitIds === null
          ? admin.firestore()
              .collection('generalSchedules')
              .where('seventyOnly', '==', true)
              .where('date', '>=', cutoffStr)
              .orderBy('date', 'asc')
              .get()
              // 색인이 만들어지는 중이면 실패한다 — 구독 전체를 깨뜨리지 않고 칠십인 전용 행사만 뺀다
              // (publicSchedulePayload와 같은 처리).
              .catch((err: unknown) => {
                console.error('publicScheduleIcs: seventy-only events query failed', err)
                return null
              })
          : null

      // 칠십인 전용 메모 — 전체 공유의 구독에서만 싣는다(publicSchedulePayload와 같은 규칙).
      const seventyNotesQuery =
        unitIds === null
          ? admin.firestore()
              .collection(SEVENTY_NOTES_COLLECTION)
              .where('date', '>=', cutoffStr)
              .get()
              .catch((err: unknown) => {
                console.error('publicScheduleIcs: seventy notes query failed', err)
                return null
              })
          : null

      const generalSeventyNotesQuery =
        unitIds === null
          ? admin.firestore()
              .collection(GENERAL_SEVENTY_NOTES_COLLECTION)
              .where('date', '>=', cutoffStr)
              .get()
              .catch((err: unknown) => {
                console.error('publicScheduleIcs: event seventy notes query failed', err)
                return null
              })
          : null

      const [schedulesSnap, ccSnap, generalSnap, seventyOnlySnap, seventyNotesSnap, generalSeventyNotesSnap] = await Promise.all([
        schedulesQuery
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
        seventyOnlyQuery,
        seventyNotesQuery,
        generalSeventyNotesQuery,
      ])

      const generalSeventyNotesById = new Map<string, string>()
      for (const d of generalSeventyNotesSnap?.docs ?? []) {
        const notes = d.data().notes
        if (typeof notes === 'string' && notes.trim()) generalSeventyNotesById.set(d.id, notes)
      }

      const seventyNotesById = new Map<string, string>()
      for (const d of seventyNotesSnap?.docs ?? []) {
        const notes = d.data().notes
        if (typeof notes === 'string' && notes.trim()) seventyNotesById.set(d.id, notes)
      }

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
        // 칠십인 전용으로 표시한 일정은 지역 공유 구독에서 뺀다.
        return unitSet === null ||
          (!isSeventyOnly(d.data()) &&
            (d.data().type === 'ward_visit' || isCcCouncilForScope(d.data(), scopeValue)))
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
        // 종일 일정은 시각 없이 날짜로 적고, 끝은 마지막 날 다음 날이다(ICS는 그날을 포함하지 않는다).
        const dates = { date: data.date as string, endDate: data.endDate as string | null | undefined }
        const allDay = isAllDaySchedule(data)
        const dtstartLine = allDay
          ? `DTSTART;VALUE=DATE:${dates.date.replace(/-/g, '')}`
          : `DTSTART;TZID=Asia/Seoul:${toIcsDateTime(dates.date, data.startTime)}`
        const dtendLine = allDay
          ? `DTEND;VALUE=DATE:${allDayExclusiveEndDate(dates).replace(/-/g, '')}`
          : `DTEND;TZID=Asia/Seoul:${toIcsDateTime(scheduleLastDate(dates), data.endTime)}`

        const lines = [
          'BEGIN:VEVENT',
          `UID:${d.id}@gaplan`,
          `DTSTAMP:${dtstamp}`,
          dtstartLine,
          dtendLine,
          `SUMMARY:${escape(summary)}`,
        ]
        const place = typeof data.location === 'string' ? data.location.trim() : ''
        if (place) lines.push(`LOCATION:${escape(place)}`)
        const descParts: string[] = []
        // 동행 정보는 전체 공유에서만 노출 — CCM 지역별 공유에는 포함하지 않음
        if (unitSet === null && data.presidentAccompanied === true) descParts.push('스테이크 회장 동행')
        if (data.notes) descParts.push(data.notes)
        if (unitSet === null && seventyNotesById.has(d.id)) {
          descParts.push(`[칠십인 전용] ${seventyNotesById.get(d.id)}`)
        }
        if (descParts.length > 0) lines.push(`DESCRIPTION:${escape(descParts.join('\n'))}`)
        const zoomUrl = safeUrl(data.zoomLink)
        if (zoomUrl) lines.push(`URL:${zoomUrl}`)
        lines.push('END:VEVENT')
        events.push(lines.join('\r\n'))
      })

      // 행사(generalSchedules)도 같은 스코프 규칙(generalScheduleInScope)으로 걸러 VEVENT로 싣는다.
      // getPublicSchedules.ts의 웹 뷰와 이 ICS 피드가 서로 다른 행사 목록을 보여주면 안 된다.
      dedupeById([...generalSnap.docs, ...(seventyOnlySnap?.docs ?? [])])
        .sort((a, b) => (a.data().date as string).localeCompare(b.data().date as string))
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
            // 설명: 담당 지역 칠십인 참석 여부(모든 구독), 그 아래 칠십인 전용 메모(전체 공유만).
            description: withSeventyAttendsLine(
              unitIds === null && generalSeventyNotesById.has(d.id)
                ? `[칠십인 전용] ${generalSeventyNotesById.get(d.id)}`
                : null,
              data.seventyAttends === true,
            ) ?? undefined,
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
  },
)
