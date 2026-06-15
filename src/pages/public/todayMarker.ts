export interface DatedGroup {
  groupKey: string
  dates: string[]
}

export interface TodayMarkerPlacement {
  groupKey: string
  itemIndex: number
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
