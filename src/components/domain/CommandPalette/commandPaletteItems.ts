export interface CommandItem {
  id: string
  /** 이미 번역된 표시 문자열. 이 모듈은 i18n을 모른다 — 그래야 순수 함수로 남는다. */
  label: string
  /** 이동할 경로. 동작 항목이면 없고 run이 대신 있다. */
  to?: string
  /** 이동이 아니라 무언가를 실행하는 항목. */
  run?: () => void
}

/**
 * 질의로 항목을 거른다. 부분 일치, 대소문자 무시, 앞뒤 공백 무시.
 *
 * 점수로 재정렬하지 않고 **원래 순서를 지킨다**. 정렬이 질의마다 바뀌면 같은 글자를
 * 이어 칠 때 항목이 목록 안에서 뛰어다니고, 손이 기억한 위치가 매번 어긋난다.
 * 항목 수가 열 개 안팎이라 순위를 매겨 얻을 것도 없다.
 */
export function filterCommandItems(items: CommandItem[], query: string): CommandItem[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return items

  return items.filter((item) => item.label.toLowerCase().includes(needle))
}
