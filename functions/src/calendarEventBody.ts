/**
 * 구글 캘린더 이벤트의 location·description.
 *
 * location은 예전에 Zoom URL을 담고 있었다. 지도 검색에 쓰이는 칸이라 URL은 맞지
 * 않지만, 그렇다고 그냥 빼면 캘린더에서 회의 링크가 사라진다. 그래서 URL은
 * description으로 옮긴다 — 구글이 설명 안의 URL을 클릭 가능하게 렌더한다.
 *
 * 빈 문자열과 undefined는 뜻이 다르다. 빈 문자열은 "이 칸을 지워라",
 * undefined는 "건드리지 마라"다. 장소가 없어졌으면 지워야 한다.
 */
export function buildCalendarEventFields(p: {
  location?: string | null
  zoomLink?: string | null
  notes?: string | null
}): { location: string; description: string } {
  const lines: string[] = []
  const zoom = p.zoomLink?.trim()
  if (zoom) lines.push(`줌: ${zoom}`)
  const notes = p.notes?.trim()
  if (notes) lines.push(notes)
  return { location: p.location?.trim() ?? '', description: lines.join('\n') }
}
