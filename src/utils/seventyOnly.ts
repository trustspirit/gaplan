/**
 * 개별 일정(접견/모임)에 "칠십인 전용"을 둘 수 있는가.
 *
 * 대상이 '기타'인 접견/모임만 된다. 방문·협의 평의회·스테이크 회장·와드 감독은 대상이 곧 공개
 * 범위를 정하므로 고를 것이 없다. 서버(functions/src/seventyOnly.ts의 canBeSeventyOnly)가 같은
 * 규칙으로 요청을 검사한다 — 한쪽만 고치면 화면에 보이는 선택지를 서버가 거부한다.
 */
export function canBeSeventyOnly(schedule: { type?: string | null; targetKind?: string | null }): boolean {
  return (schedule.type === 'interview' || schedule.type === 'meeting') && schedule.targetKind === 'other'
}
