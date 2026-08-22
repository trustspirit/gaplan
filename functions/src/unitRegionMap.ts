import { REGION_UNITS } from './regions'

/**
 * 유닛(스테이크/지방부) → 소속 CC. `regions.ts`의 CC 편성에서 그대로 뒤집어 만든다.
 *
 * 예전에는 손으로 적은 별도 표였는데, CC 편성이 바뀌었을 때 이쪽만 옛 값으로 남아
 * 경기 스테이크 일정이 공개 페이지에서는 서울남 CC, 구글 캘린더에서는 서울 CC로
 * 갈리는 버그가 있었다. 편성의 출처는 `regions.ts` 하나뿐이어야 한다.
 */
export const UNIT_REGION_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_UNITS).flatMap(([regionId, unitIds]) =>
    unitIds.map((unitId) => [unitId, regionId]),
  ),
)
