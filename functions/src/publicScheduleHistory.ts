import { dedupeById } from './seventyOnly'
import { GENERAL_SEVENTY_NOTES_COLLECTION, SEVENTY_NOTES_COLLECTION } from './seventyNotes'
import {
  isGeneralInPublicScope,
  isScheduleInPublicScope,
  notesById,
  resolvePublicScope,
  schedulesBaseQuery,
  toPublicGeneralSchedule,
  toPublicSchedule,
  type FirestoreLike,
  type FirestoreQueryDocLike,
  type FirestoreQueryLike,
  type PublicGeneralSchedule,
  type PublicSchedule,
  type PublicScope,
} from './publicSchedulePayload'

/**
 * 공개 일정표에서 위로 스크롤할 때 이어 붙이는 "이전 일정" 한 쪽.
 *
 * 처음 페이지(buildPublicSchedulePayload)는 일주일 전부터만 싣는다 — 지난 일정을 다 실으면
 * 목록이 길어져 오늘이 애매하게 가운데쯤 놓인다. 그보다 앞선 일정은 여기서 before(제외)보다
 * 이른 것을 최신순으로 HISTORY_PAGE_SIZE개쯤씩 받는다. 일정과 행사를 한 줄로 세어 자른다.
 *
 * 공개 범위 판정·필드 정리는 처음 페이지와 같은 함수를 쓴다 — 여기서 따로 만들면 이전 일정에서만
 * 비공개 항목이 새거나 필드가 빠진다.
 */

export const HISTORY_PAGE_SIZE = 10

// 쿼리마다 한 번에 읽는 문서 수. 지역 링크는 접견·모임 같은 문서를 읽은 뒤 걸러내므로
// 쪽 크기보다 넉넉히 읽어야 한 번에 한 쪽이 찬다.
const RAW_LIMIT = 30
// 한 날짜의 문서를 끝까지 읽을 때의 상한. 하루에 이보다 많은 확정 일정은 사실상 없다.
const SAME_DATE_LIMIT = 200
// 거른 뒤 한 쪽이 안 차면 더 이전으로 이어 읽는다. 공개(로그인 없는) 호출 한 번이 읽는
// 양이 끝없이 늘지 않도록 묶는다 — 덜 찬 쪽이 와도 클라이언트가 nextBefore로 이어 부른다.
const MAX_ROUNDS = 4

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isHistoryDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value))
}

export interface PublicScheduleHistoryPage {
  schedules: PublicSchedule[]
  generalSchedules: PublicGeneralSchedule[]
  // 다음에 넘길 before. null이면 더 이전 일정이 없다.
  nextBefore: string | null
}

type Kind = 'schedule' | 'general'

interface Source {
  kind: Kind
  /** 공통 조건(범위·상태)만 건 쿼리. 날짜 조건과 정렬은 호출부가 붙인다. */
  base: () => FirestoreQueryLike
}

interface Entry {
  kind: Kind
  doc: FirestoreQueryDocLike
  date: string
}

/** 처음 페이지가 읽는 쿼리들과 같은 조건이다(buildPublicSchedulePayload). */
function sourcesFor(db: FirestoreLike, scope: PublicScope): Source[] {
  const { unitIds, scopeValue } = scope
  const sources: Source[] = [
    {
      kind: 'schedule',
      base: () => schedulesBaseQuery(db, scope),
    },
    {
      kind: 'general',
      base: () => db.collection('generalSchedules').where('isPublic', '==', true),
    },
  ]
  if (unitIds !== null) {
    // 협의 평의회는 unitId가 비어 있어 위 unitId-in 쿼리에 걸리지 않는다.
    sources.push({
      kind: 'schedule',
      base: () =>
        db.collection('schedules').where('regionId', '==', scopeValue).where('status', '==', 'confirmed'),
    })
  } else {
    // 칠십인 전용 행사는 isPublic이 false다 — 전체 공유에서만 따로 읽는다.
    sources.push({
      kind: 'general',
      base: () => db.collection('generalSchedules').where('seventyOnly', '==', true),
    })
  }
  return sources
}

function inScope(entry: Entry, scope: PublicScope): boolean {
  const data = entry.doc.data()
  return entry.kind === 'schedule' ? isScheduleInPublicScope(data, scope) : isGeneralInPublicScope(data, scope)
}

function toEntries(kind: Kind, docs: FirestoreQueryDocLike[]): Entry[] {
  return docs.map((doc) => ({ kind, doc, date: doc.data().date as string }))
}

/**
 * before보다 이른 항목을 한 쪽 읽는다.
 *
 * 쿼리마다 RAW_LIMIT개로 자르므로, 꽉 찬 쿼리는 그 마지막 날짜(R)에서 문서가 더 남아 있을
 * 수 있다. 모든 쿼리가 빠짐없이 읽은 구간은 "가장 늦은 R보다 뒤"뿐이다(boundary). 그 구간에서
 * 최신순으로 쪽 크기만큼 자르되, 잘린 자리의 날짜는 통째로 넣는다 — 같은 날 일정이 두 쪽에
 * 걸쳐 나뉘면 다음 쪽의 before(제외)가 그 날의 나머지를 건너뛴다.
 * 그 구간이 쪽 크기에 못 미치면 boundary 날짜를 끝까지 따로 읽어 채운다.
 */
async function readRound(
  sources: Source[],
  scope: PublicScope,
  before: string,
): Promise<{ entries: Entry[]; nextBefore: string | null }> {
  const raws = await Promise.all(
    sources.map((s) =>
      s.base().where('date', '<', before).orderBy('date', 'desc').limit(RAW_LIMIT).get(),
    ),
  )

  let boundary: string | null = null
  for (const raw of raws) {
    if (raw.docs.length < RAW_LIMIT) continue
    const last = raw.docs[raw.docs.length - 1].data().date as string
    if (boundary === null || last > boundary) boundary = last
  }

  const all = raws.flatMap((raw, i) => toEntries(sources[i].kind, raw.docs)).filter((e) => inScope(e, scope))
  const known = all
    .filter((e) => boundary === null || e.date > boundary)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (known.length >= HISTORY_PAGE_SIZE) {
    const cut = known[HISTORY_PAGE_SIZE - 1].date
    return { entries: known.filter((e) => e.date >= cut), nextBefore: cut }
  }

  if (boundary === null) return { entries: known, nextBefore: null }

  const sameDate = await Promise.all(
    sources.map((s) => s.base().where('date', '==', boundary).limit(SAME_DATE_LIMIT).get()),
  )
  const atBoundary = sameDate
    .flatMap((raw, i) => toEntries(sources[i].kind, raw.docs))
    .filter((e) => inScope(e, scope))
  return { entries: [...known, ...atBoundary], nextBefore: boundary }
}

export async function buildPublicScheduleHistory(
  db: FirestoreLike,
  token: string,
  before: string,
): Promise<PublicScheduleHistoryPage> {
  const scope = await resolvePublicScope(db, token)
  const sources = sourcesFor(db, scope)

  const entries: Entry[] = []
  let cursor: string | null = before
  for (let round = 0; round < MAX_ROUNDS && cursor !== null && entries.length < HISTORY_PAGE_SIZE; round++) {
    const page = await readRound(sources, scope, cursor)
    entries.push(...page.entries)
    cursor = page.nextBefore
  }

  const scheduleDocs = dedupeById(entries.filter((e) => e.kind === 'schedule').map((e) => e.doc))
  const generalDocs = dedupeById(entries.filter((e) => e.kind === 'general').map((e) => e.doc))

  // 칠십인 전용 메모는 전체 공유에서만 붙인다. 이번 쪽이 덮는 날짜 구간만 읽는다.
  let seventyNotes = new Map<string, string>()
  let generalSeventyNotes = new Map<string, string>()
  if (scope.unitIds === null && entries.length > 0) {
    const from = entries.reduce((min, e) => (e.date < min ? e.date : min), entries[0].date)
    // 메모를 못 읽었다고 이전 일정 전체를 못 받게 두지 않는다 — 메모만 빠진다(처음 페이지와 같다).
    const readNotes = (collection: string) =>
      db
        .collection(collection)
        .where('date', '>=', from)
        .where('date', '<', before)
        .get()
        .catch((err: unknown) => {
          console.error(`[publicScheduleHistory] ${collection} query failed`, err)
          return null
        })
    const [notesSnap, generalNotesSnap] = await Promise.all([
      readNotes(SEVENTY_NOTES_COLLECTION),
      readNotes(GENERAL_SEVENTY_NOTES_COLLECTION),
    ])
    seventyNotes = notesById(notesSnap)
    generalSeventyNotes = notesById(generalNotesSnap)
  }

  const byDateAsc = (a: FirestoreQueryDocLike, b: FirestoreQueryDocLike) =>
    (a.data().date as string).localeCompare(b.data().date as string)

  return {
    schedules: scheduleDocs.sort(byDateAsc).map((d) => toPublicSchedule(d, scope, seventyNotes)),
    generalSchedules: generalDocs.sort(byDateAsc).map((d) => toPublicGeneralSchedule(d, scope, generalSeventyNotes)),
    nextBefore: cursor,
  }
}
