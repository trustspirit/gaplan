import type { ScheduleCacheData } from './scheduleCache'

// functions/src/publicInlineScript.ts의 INLINE_DATA_ID와 반드시 같아야 한다.
// 그 모듈은 Buffer(Node 전용)를 쓰므로 값을 import해 오지 않고 여기 다시 적되,
// 테스트가 두 값을 맞대어 고정한다.
const INLINE_DATA_ID = '__public_data__'

/**
 * 서버(publicScheduleRenderer)가 문서에 실어 보낸 일정 데이터를 읽는다.
 * 있으면 첫 페인트에 바로 쓰이고, 두 번째 CF 왕복이 화면에서 사라진다.
 *
 * 한 번 읽고 태그를 지우는 이유: 뒤로가기 복원(bfcache)으로 같은 문서가 되살아났을 때
 * 낡은 데이터를 최신인 양 다시 쓰지 않게 하려는 것이다. 지워도 손해가 없다 —
 * 페이지는 언제나 백그라운드 fetch로 최신을 덮는다.
 */
export function readInlinePublicData(token: string): ScheduleCacheData | null {
  const el = document.getElementById(INLINE_DATA_ID)
  if (!el) return null
  const raw = el.textContent ?? ''
  el.remove()

  try {
    const parsed = JSON.parse(raw) as { token?: string; data?: Partial<ScheduleCacheData> }
    // CDN·bfcache가 다른 토큰의 문서를 내줄 수 있다 — 그 데이터를 그리면 볼 권한이
    // 없는 일정이 화면에 뜬다.
    if (parsed.token !== token) return null
    const data = parsed.data
    if (!data || !Array.isArray(data.schedules)) return null
    return {
      schedules: data.schedules,
      generalSchedules: Array.isArray(data.generalSchedules) ? data.generalSchedules : [],
      scopeDisplayName: data.scopeDisplayName ?? null,
    }
  } catch {
    return null
  }
}
