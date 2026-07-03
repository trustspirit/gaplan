import type { Schedule } from '@/types'

// Column layout for overlapping week-view blocks: overlapping schedules are
// split into side-by-side sub-columns instead of stacking on top of each other.
export function layoutDayBlocks(items: Schedule[]): Array<{ s: Schedule; col: number; cols: number }> {
  const toMin = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }
  const sorted = [...items].sort(
    (a, b) => toMin(a.startTime) - toMin(b.startTime) || toMin(a.endTime) - toMin(b.endTime)
  )
  const placed: Array<{ s: Schedule; col: number; cols: number }> = []
  let cluster: Array<{ s: Schedule; col: number; cols: number }> = []
  let colEnds: number[] = []
  let clusterEnd = -1
  const flush = () => {
    const cols = colEnds.length
    cluster.forEach((p) => { p.cols = cols })
    placed.push(...cluster)
    cluster = []
    colEnds = []
  }
  for (const s of sorted) {
    const start = toMin(s.startTime)
    const end = toMin(s.endTime)
    if (cluster.length > 0 && start >= clusterEnd) flush()
    let col = colEnds.findIndex((e) => e <= start)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(end)
    } else {
      colEnds[col] = end
    }
    cluster.push({ s, col, cols: 1 })
    clusterEnd = cluster.length === 1 ? end : Math.max(clusterEnd, end)
  }
  flush()
  return placed
}
