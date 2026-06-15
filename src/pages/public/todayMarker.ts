export interface DatedGroup {
  groupKey: string
  dates: string[]
}

export interface TodayMarkerPlacement {
  groupKey: string
  itemIndex: number
}

export interface TodayMarkerScrollParams {
  markerTop: number
  scrollY: number
  viewportHeight: number
  topOffset?: number
  thresholdRatio?: number
}

export function getTodayMarkerPlacement(groups: DatedGroup[], today: string): TodayMarkerPlacement | null {
  if (groups.length === 0) return null

  for (const group of groups) {
    const index = group.dates.findIndex(date => date >= today)
    if (index >= 0) return { groupKey: group.groupKey, itemIndex: index }
  }

  const lastGroup = groups[groups.length - 1]
  return { groupKey: lastGroup.groupKey, itemIndex: lastGroup.dates.length }
}

export function getTodayMarkerScrollTop(params: TodayMarkerScrollParams): number | null {
  const topOffset = params.topOffset ?? 88
  const threshold = params.viewportHeight * (params.thresholdRatio ?? 0.45)
  if (params.markerTop <= threshold) return null

  return Math.max(0, params.scrollY + params.markerTop - topOffset)
}
