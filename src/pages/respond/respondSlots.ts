export interface DateSlotRanges {
  date: string
  timeRanges: Array<{ startTime: string; endTime: string }>
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const toHHmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * 관리자가 칠해 둔 시간 범위를 접견 한 번 길이로 자른다. 앱 안의 응답 화면
 * (availabilityService.computeInterviewSlots)과 같은 칸이 나와야, 공개 링크로 낸 응답이
 * 응답 현황표의 칸과 맞는다 — 범위를 통째로 내면 어느 칸에도 걸리지 않는다.
 * 그 모듈은 Firestore를 끌고 와서, 공개 화면은 같은 규칙을 여기 따로 둔다(테스트가 둘을 맞춘다).
 */
export function splitDateSlots(dateSlots: DateSlotRanges[], slotDurationMinutes: number): DateSlotRanges[] {
  const step = slotDurationMinutes > 0 ? slotDurationMinutes : 60
  return dateSlots.map(({ date, timeRanges }) => ({
    date,
    timeRanges: timeRanges.flatMap(({ startTime, endTime }) => {
      const end = toMinutes(endTime)
      const out: Array<{ startTime: string; endTime: string }> = []
      for (let t = toMinutes(startTime); t + step <= end; t += step) {
        out.push({ startTime: toHHmm(t), endTime: toHHmm(t + step) })
      }
      return out
    }),
  }))
}
