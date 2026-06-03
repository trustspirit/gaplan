import dayjs from 'dayjs'

/** Returns the first Sunday of the given month (year/month are 0-indexed like dayjs). */
export function getFirstSundayOfMonth(year: number, month: number): dayjs.Dayjs {
  const first = dayjs().year(year).month(month).startOf('month')
  const daysToSunday = (7 - first.day()) % 7
  return first.add(daysToSunday, 'day')
}

/** Returns true if `d` is the first Sunday of its month (i.e. 금식일). */
export function isFastSunday(d: dayjs.Dayjs): boolean {
  if (d.day() !== 0) return false
  const firstSunday = getFirstSundayOfMonth(d.year(), d.month())
  return d.isSame(firstSunday, 'day')
}
