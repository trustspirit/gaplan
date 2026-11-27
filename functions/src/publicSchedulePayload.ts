import { getScopeUnitIds, getScopeDisplayName, getScopeRegionId } from './regions'
import { CC_COUNCIL_TARGET_KIND, isCcCouncilForScope } from './ccCouncil'
import { generalScheduleInScope } from './generalScheduleScope'
import { dedupeById, isSeventyOnly } from './seventyOnly'
import { isAllDaySchedule, isMultiDaySchedule } from './scheduleDates'
import { GENERAL_SEVENTY_NOTES_COLLECTION, SEVENTY_NOTES_COLLECTION } from './seventyNotes'

/**
 * "이 토큰이 무엇을 볼 수 있는가"의 유일한 판정.
 *
 * 이 판정은 이미 두 곳에 복사돼 있었다(getPublicSchedules, publicScheduleIcs) —
 * 렌더러가 세 번째 복사본을 만들면 세 곳이 각자 늙는다. 콜러블·렌더러가 여기를
 * 부르고, ICS 이전은 후속 작업으로 남긴다.
 *
 * 던지는 건 PublicScopeError다 — firebase-functions의 HttpsError를 던지면 이
 * 모듈이 호출 방식(onCall/onRequest)에 묶인다. 각 호출부가 자기 방식대로 옮겨 담는다.
 *
 * firebase-admin도 import하지 않는다 — 이 파일이 실제로 쓰는 Firestore 표면만
 * FirestoreLike로 최소 선언해 받는다(주입). scheduleRules.ts/generalScheduleScope.ts와
 * 같은 이유: 순수 판정 모듈은 서버 SDK에 묶이지 않아야 유닛 테스트를 firebase-admin
 * 없이(이 저장소엔 설치돼 있지도 않다) 돌릴 수 있다.
 */
export class PublicScopeError extends Error {
  constructor(
    // 'not-enabled'(전역 schedulePublic 꺼짐)와 'scope-not-enabled'(이 유닛/CC 링크만 꺼짐)를
    // 합치지 마라 — 둘 다 permission-denied로 나가지만 뜻이 다르다. 하나로 합치면 나중에
    // 특정 링크가 왜 막혔는지 디버깅할 때 "전체가 꺼졌나, 이 링크만 꺼졌나"를 구분할 수 없다.
    public readonly reason: 'invalid-token' | 'not-enabled' | 'scope-not-enabled' | 'invalid-scope',
  ) {
    super(reason)
    this.name = 'PublicScopeError'
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FirestoreDocData = Record<string, any>

interface FirestoreDocSnapshotLike {
  exists: boolean
  data(): FirestoreDocData | undefined
}

interface FirestoreDocRefLike {
  get(): Promise<FirestoreDocSnapshotLike>
}

export interface FirestoreQueryDocLike {
  id: string
  data(): FirestoreDocData
}

export interface FirestoreQuerySnapshotLike {
  docs: FirestoreQueryDocLike[]
}

export interface FirestoreQueryLike {
  where(field: string, op: string, value: unknown): FirestoreQueryLike
  orderBy(field: string, direction?: string): FirestoreQueryLike
  limit(n: number): FirestoreQueryLike
  get(): Promise<FirestoreQuerySnapshotLike>
}

/** buildPublicSchedulePayload가 실제로 쓰는 Firestore 표면만 담은 최소 구조 타입. */
export interface FirestoreLike {
  doc(path: string): FirestoreDocRefLike
  collection(name: string): FirestoreQueryLike
}

export interface PublicSchedule {
  id: string
  type: string
  unitId: string
  regionId?: string
  targetKind?: string
  date: string
  // 여러 날 모임의 마지막 날. 빠지면 구독·캘린더는 여러 날로, 공개 일정표는 하루로 보여준다.
  endDate?: string
  // 종일 일정. startTime/endTime은 00:00/23:59로 채워져 오지만 화면은 "종일"로 보여준다.
  allDay?: boolean
  startTime: string
  endTime: string
  status: string
  wardName?: string
  zoomLink?: string | null
  customTitle?: string | null
  confirmedAt?: string
  notes?: string | null
  // 칠십인 전용 메모 — 전체 공유(칠십인 전용 페이지)에서만 실린다. seventyNotes.ts 참고.
  seventyNotes?: string
  presidentAccompanied?: boolean
}

export interface PublicGeneralSchedule {
  id: string
  title: string
  date: string
  // 여러 날 행사의 종료일. 이게 빠지면 ICS·구글 캘린더는 이틀로, 공개 일정표는
  // 하루로 보여줘 같은 행사를 두 곳에서 다르게 안내하게 된다.
  endDate?: string
  startTime?: string
  endTime?: string
  category: 'conference' | 'fasting' | 'other'
  isPublic: true
  // 칠십인 전용 메모 — 전체 공유(칠십인 전용 페이지)에서만 실린다.
  seventyNotes?: string
  // 담당 지역 칠십인이 참석하는 행사. 모든 공개 페이지에 실린다 — 숨길 정보가 아니다.
  seventyAttends?: boolean
}

export interface PublicSchedulePayload {
  schedules: PublicSchedule[]
  generalSchedules: PublicGeneralSchedule[]
  scopeDisplayName: string | null
  // 이 응답이 담은 가장 이른 날짜(포함). 이보다 앞선 일정은 getPublicScheduleHistory에
  // before로 넘겨 10개씩 받는다 — 일정·행사가 같은 경계를 써야 그 사이가 비지 않는다.
  historyBefore: string
}

/** 토큰이 가리키는 공개 범위. 판정은 resolvePublicScope 한 곳에서만 한다. */
export interface PublicScope {
  scopeValue: string
  // 전체 공유면 null, 그 외에는 이 링크가 보여줄 유닛 id 목록.
  unitIds: string[] | null
  scopeDisplayName: string | null
  // 행사 스코프 판정은 유닛 링크에서도 그 유닛의 CC 기준으로 해야 한다.
  scopeRegionId: string | null
}

export async function resolvePublicScope(db: FirestoreLike, token: string): Promise<PublicScope> {
  const [tokensSnap, settingsSnap, unitsSnap] = await Promise.all([
    db.doc('settings/publicTokens').get(),
    db.doc('settings/public').get(),
    db.doc('settings/publicUnits').get(),
  ])

  const scopeValue: string | undefined = tokensSnap.exists ? tokensSnap.data()?.[token] : undefined

  if (!scopeValue) {
    throw new PublicScopeError('invalid-token')
  }

  const globalEnabled = settingsSnap.exists && settingsSnap.data()?.schedulePublic === true

  if (!globalEnabled) {
    throw new PublicScopeError('not-enabled')
  }

  let unitIds: string[] | null = null
  let scopeDisplayName: string | null = null
  let scopeRegionId: string | null = null

  if (scopeValue !== '__all__') {
    const unitEnabled = unitsSnap.exists && unitsSnap.data()?.[scopeValue]?.enabled === true

    if (!unitEnabled) {
      throw new PublicScopeError('scope-not-enabled')
    }

    unitIds = getScopeUnitIds(scopeValue)
    if (unitIds.length === 0) {
      throw new PublicScopeError('invalid-scope')
    }
    scopeDisplayName = getScopeDisplayName(scopeValue) || null
    scopeRegionId = getScopeRegionId(scopeValue)
  }

  return { scopeValue, unitIds, scopeDisplayName, scopeRegionId }
}

/**
 * 일정 문서가 이 공개 범위에 실리는가.
 * 지역 공유는 와드 방문만 노출하되, 그 CC의 협의 평의회는 함께 내보낸다.
 * 칠십인 전용으로 표시한 일정(주로 협의 평의회)은 지역 공유에서 뺀다.
 */
export function isScheduleInPublicScope(data: FirestoreDocData, scope: PublicScope): boolean {
  if (scope.unitIds === null) return true
  return (
    !isSeventyOnly(data) &&
    (data.type === 'ward_visit' || isCcCouncilForScope(data, scope.scopeValue))
  )
}

/** 일정 문서를 공개 응답 모양으로 옮긴다. 칠십인 전용 필드는 전체 공유에서만 싣는다. */
export function toPublicSchedule(
  d: FirestoreQueryDocLike,
  scope: PublicScope,
  seventyNotesById: Map<string, string>,
): PublicSchedule {
  const sd = d.data()
  const isAll = scope.unitIds === null
  return {
    id: d.id,
    type: sd.type,
    unitId: sd.unitId,
    ...(sd.regionId ? { regionId: sd.regionId } : {}),
    ...(sd.targetKind === CC_COUNCIL_TARGET_KIND ? { targetKind: CC_COUNCIL_TARGET_KIND } : {}),
    date: sd.date,
    ...(isMultiDaySchedule(sd as { date: string; endDate?: string | null }) ? { endDate: sd.endDate } : {}),
    ...(isAllDaySchedule(sd) ? { allDay: true } : {}),
    startTime: sd.startTime,
    endTime: sd.endTime,
    status: sd.status,
    ...(sd.wardName ? { wardName: sd.wardName } : {}),
    ...(sd.zoomLink != null ? { zoomLink: sd.zoomLink } : {}),
    ...(sd.customTitle != null ? { customTitle: sd.customTitle } : {}),
    ...(sd.confirmedAt ? { confirmedAt: sd.confirmedAt } : {}),
    ...(sd.notes != null ? { notes: sd.notes } : {}),
    ...(isAll && seventyNotesById.has(d.id) ? { seventyNotes: seventyNotesById.get(d.id) } : {}),
    ...(isAll && sd.presidentAccompanied === true ? { presidentAccompanied: true } : {}),
  }
}

/** 행사가 이 공개 범위에 실리는가. 로그인 사용자용 관련성 판단(isGeneralScheduleRelevant,
 *  src/types/generalSchedule.ts)과는 별개의 규칙이다. */
export function isGeneralInPublicScope(data: FirestoreDocData, scope: PublicScope): boolean {
  return generalScheduleInScope(data, scope.scopeRegionId, scope.unitIds)
}

/** 행사 문서를 공개 응답 모양으로 옮긴다. 칠십인 전용 메모는 전체 공유에서만 싣는다. */
export function toPublicGeneralSchedule(
  d: FirestoreQueryDocLike,
  scope: PublicScope,
  generalSeventyNotesById: Map<string, string>,
): PublicGeneralSchedule {
  const data = d.data()
  return {
    id: d.id,
    title: data.title,
    date: data.date,
    ...(data.endDate ? { endDate: data.endDate } : {}),
    ...(data.startTime ? { startTime: data.startTime } : {}),
    ...(data.endTime ? { endTime: data.endTime } : {}),
    category: data.category,
    isPublic: true,
    ...(data.seventyAttends === true ? { seventyAttends: true } : {}),
    ...(scope.unitIds === null && generalSeventyNotesById.has(d.id)
      ? { seventyNotes: generalSeventyNotesById.get(d.id) }
      : {}),
  }
}

/** 메모 컬렉션 조회 결과를 id → 메모 맵으로. 비어 있는 메모는 뺀다. */
export function notesById(snap: FirestoreQuerySnapshotLike | null): Map<string, string> {
  const map = new Map<string, string>()
  for (const d of snap?.docs ?? []) {
    const notes = d.data().notes
    if (typeof notes === 'string' && notes.trim()) map.set(d.id, notes)
  }
  return map
}

/** 공개 일정표가 처음에 싣는 가장 이른 날짜 — 일주일 전. */
function initialCutoff(): string {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  return cutoff.toISOString().split('T')[0]
}

export async function buildPublicSchedulePayload(db: FirestoreLike, token: string): Promise<PublicSchedulePayload> {
  const scope = await resolvePublicScope(db, token)
  const { scopeValue, unitIds, scopeDisplayName } = scope

  // 일정과 행사가 같은 경계를 쓴다 — 예전처럼 행사만 오늘부터 실으면, 위로 스크롤해
  // 이전 일정을 이어 받을 때 지난 일주일의 행사가 영영 빠진다.
  const cutoffStr = initialCutoff()

  let query = db.collection('schedules')
  if (unitIds !== null) query = query.where('unitId', 'in', unitIds)

  // 협의 평의회는 CC 전체가 대상이라 unitId가 비어 있어 위 unitId-in 쿼리에 걸리지 않는다.
  // regionId로 한 번 더 조회해 합친다. (전체 공유는 애초에 전 일정을 읽으므로 불필요)
  const ccQuery =
    unitIds !== null
      ? db.collection('schedules')
          .where('regionId', '==', scopeValue)
          .where('status', '==', 'confirmed')
          .where('date', '>=', cutoffStr)
          .orderBy('date', 'asc')
          .get()
      : null

  // 칠십인 전용 행사는 isPublic이 false라 아래 isPublic 쿼리에 걸리지 않는다. 전체 공유
  // (칠십인 전용 페이지)에서만 한 번 더 조회해 합친다 — CC·유닛 링크는 아예 읽지 않는다.
  const seventyOnlyQuery =
    unitIds === null
      ? db
          .collection('generalSchedules')
          .where('seventyOnly', '==', true)
          .where('date', '>=', cutoffStr)
          .orderBy('date', 'asc')
          .get()
          // 이 조회는 (seventyOnly, date) 복합 색인이 있어야 한다. 색인이 아직 만들어지는 중이면
          // (배포 직후 몇 분) 실패하는데, 그렇다고 일정표 전체를 못 열게 두지는 않는다 —
          // 칠십인 전용 행사만 잠시 빠진다.
          .catch((err: unknown) => {
            console.error('[publicSchedulePayload] seventy-only events query failed', err)
            return null
          })
      : null

  // 칠십인 전용 메모도 전체 공유에서만 읽는다. 일정 문서가 아니라 별도 컬렉션에 있어
  // (회장이 일정 문서를 읽을 수 있어서다) 날짜 범위로 한 번에 가져와 일정 id로 붙인다.
  const seventyNotesQuery =
    unitIds === null
      ? db
          .collection(SEVENTY_NOTES_COLLECTION)
          .where('date', '>=', cutoffStr)
          .get()
          // 메모를 못 읽었다고 일정표 전체를 못 열게 두지 않는다 — 메모만 빠진다.
          .catch((err: unknown) => {
            console.error('[publicSchedulePayload] seventy notes query failed', err)
            return null
          })
      : null

  const generalSeventyNotesQuery =
    unitIds === null
      ? db
          .collection(GENERAL_SEVENTY_NOTES_COLLECTION)
          .where('date', '>=', cutoffStr)
          .get()
          .catch((err: unknown) => {
            console.error('[publicSchedulePayload] event seventy notes query failed', err)
            return null
          })
      : null

  const [snap, generalSnap, ccSnap, seventyOnlySnap, seventyNotesSnap, generalSeventyNotesSnap] = await Promise.all([
    query
      .where('status', '==', 'confirmed')
      .where('date', '>=', cutoffStr)
      .orderBy('date', 'asc')
      .get(),
    db
      .collection('generalSchedules')
      .where('isPublic', '==', true)
      .where('date', '>=', cutoffStr)
      .orderBy('date', 'asc')
      .get(),
    ccQuery,
    seventyOnlyQuery,
    seventyNotesQuery,
    generalSeventyNotesQuery,
  ])

  const generalSeventyNotesById = notesById(generalSeventyNotesSnap)
  const seventyNotesById = notesById(seventyNotesSnap)

  // 두 쿼리는 서로 겹치지 않지만(협의 평의회는 unitId가 빈 값), 방어적으로 id 기준 중복을 제거한다.
  const docs = dedupeById([...snap.docs, ...(ccSnap?.docs ?? [])])

  const schedules: PublicSchedule[] = docs
    .filter((d) => isScheduleInPublicScope(d.data(), scope))
    .sort((a, b) => (a.data().date as string).localeCompare(b.data().date as string))
    .map((d) => toPublicSchedule(d, scope, seventyNotesById))

  const generalDocs = dedupeById([...generalSnap.docs, ...(seventyOnlySnap?.docs ?? [])]).sort((a, b) =>
    (a.data().date as string).localeCompare(b.data().date as string),
  )

  const generalSchedules: PublicGeneralSchedule[] = generalDocs
    .filter((d) => isGeneralInPublicScope(d.data(), scope))
    .map((d) => toPublicGeneralSchedule(d, scope, generalSeventyNotesById))

  return { schedules, generalSchedules, scopeDisplayName, historyBefore: cutoffStr }
}
