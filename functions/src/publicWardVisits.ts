import {
  PublicScopeError,
  resolvePublicScope,
  schedulesBaseQuery,
  type FirestoreLike,
} from './publicSchedulePayload'

/**
 * 칠십인 개인 링크의 "방문 와드" 탭이 쓰는 한 해 치 와드 방문.
 *
 * 1년 표를 한 번에 채워야 해서 이전 일정처럼 10개씩 잇지 않고 연 단위로 받는다. 화면이 쓰는
 * 날짜·와드·유닛만 싣는다 — 시간·메모·Zoom·칠십인 메모는 이 탭에 필요 없고, 싣지 않으면
 * 새어 나갈 일도 없다.
 */

export interface PublicWardVisit {
  id: string
  date: string
  wardName: string
  unitId: string
}

const MIN_YEAR = 2000

function seoulYear(now: Date): number {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCFullYear()
}

/** 받을 수 있는 해: 2000년부터 (서울 기준) 내년까지의 정수. */
export function isWardVisitYear(value: unknown, now: Date = new Date()): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_YEAR &&
    value <= seoulYear(now) + 1
  )
}

export async function buildPublicWardVisits(
  db: FirestoreLike,
  token: string,
  year: number,
): Promise<{ visits: PublicWardVisit[] }> {
  const scope = await resolvePublicScope(db, token)
  // 전체 공유·지역 링크는 여러 칠십인의 방문이 섞인다 — 이 탭은 개인 링크에만 있다.
  if (scope.seventyUid === null) throw new PublicScopeError('invalid-scope')

  const snap = await schedulesBaseQuery(db, scope)
    .where('date', '>=', `${year}-01-01`)
    .where('date', '<=', `${year}-12-31`)
    .orderBy('date', 'asc')
    .get()

  const visits = snap.docs
    .filter((d) => d.data().type === 'ward_visit')
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        date: data.date as string,
        wardName: typeof data.wardName === 'string' ? data.wardName : '',
        unitId: typeof data.unitId === 'string' ? data.unitId : '',
      }
    })
  return { visits }
}
