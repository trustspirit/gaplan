/**
 * 영어로 연 공개 추천 페이지에서 DB에서 온 한국어(행사·일정 이름, CC 이름)를 영어로 바꾼다.
 * 바꿀 글을 모으고(koreanTextsOf), 옮긴 것으로 갈아 끼운다(withEnglishTexts). SDK 없음.
 */

const HANGUL = /[ㄱ-ㆎ가-힣]/

interface Translatable {
  calendarEvents?: { title: string }[]
  sundayStatus?: Record<string, {
    busy: { label: string }[]
    notes: { title: string }[]
    unitBlocks: Record<string, string>
  }>
  regions?: { name: string }[]
}

/** 영어로 옮길 한국어 글 — 겹치지 않게, 한글이 든 것만 */
export function koreanTextsOf(view: Translatable): string[] {
  const out = new Set<string>()
  const add = (s: string | undefined) => {
    if (s && HANGUL.test(s)) out.add(s)
  }
  view.calendarEvents?.forEach((e) => add(e.title))
  for (const st of Object.values(view.sundayStatus ?? {})) {
    st.busy.forEach((b) => add(b.label))
    st.notes.forEach((n) => add(n.title))
    Object.values(st.unitBlocks).forEach(add)
  }
  view.regions?.forEach((r) => add(r.name))
  return [...out]
}

/** 옮긴 것이 있는 글만 갈아 끼운다 — 없으면 한국어 그대로 */
export function withEnglishTexts<T extends Translatable>(view: T, english: Record<string, string>): T {
  const en = (s: string) => english[s] || s
  return {
    ...view,
    ...(view.calendarEvents && { calendarEvents: view.calendarEvents.map((e) => ({ ...e, title: en(e.title) })) }),
    ...(view.sundayStatus && {
      sundayStatus: Object.fromEntries(
        Object.entries(view.sundayStatus).map(([date, st]) => [date, {
          ...st,
          busy: st.busy.map((b) => ({ ...b, label: en(b.label) })),
          notes: st.notes.map((n) => ({ ...n, title: en(n.title) })),
          unitBlocks: Object.fromEntries(Object.entries(st.unitBlocks).map(([k, v]) => [k, en(v)])),
        }]),
      ),
    }),
    ...(view.regions && { regions: view.regions.map((r) => ({ ...r, name: en(r.name) })) }),
  }
}
