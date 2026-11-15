import type { TFunction } from 'i18next'
import {
  isFirstSunday,
  isGeneralConferenceSunday,
  type BusyReason,
  type SundayStatus,
} from '../../../../functions/src/visitSundayAvailability'

/** 그날 자체가 와드 방문을 하지 않는 날 — 이것만 있으면 다른 이유는 군더더기다. */
const FIXED_KINDS = new Set(['fast', 'generalConference'])

function busyText(b: BusyReason, t: TFunction): string {
  if (b.kind === 'schedule') {
    const type = b.scheduleType ? t(`schedule.type.${b.scheduleType}`, { defaultValue: '' }) : ''
    return [type || t('visitRequest.busyKind.schedule'), b.label].filter(Boolean).join(' · ')
  }
  if (b.kind === 'event') return [t('visitRequest.busyKind.event'), b.label].filter(Boolean).join(' · ')
  return t(`visitRequest.reason.${b.kind}`)
}

/**
 * 요청 만들기 화면에서 그 일요일을 고를 수 없는 이유들. 로그인한 칠십인·집행서기만 보는 화면이라
 * 일정 제목(와드 이름 등)까지 보여 준다. 서버 응답이 아직 없어도 금식·연차 대회 주일은 안다.
 */
export function unavailableReasons(date: string, status: SundayStatus | undefined, t: TFunction): string[] {
  const busy = status?.busy ?? []
  const fixed = busy.filter((b) => FIXED_KINDS.has(b.kind))
  if (fixed.length > 0) return fixed.map((b) => busyText(b, t))
  if (busy.length > 0) return busy.map((b) => busyText(b, t))
  if (!status && isGeneralConferenceSunday(date)) return [t('visitRequest.reason.generalConference')]
  if (!status && isFirstSunday(date)) return [t('visitRequest.reason.fast')]
  return []
}

/** 고를 수는 있지만 일부 스테이크가 행사로 빠지는 날: "서울 스테이크(서울 스테이크 대회)" */
export function unitBlockText(
  status: SundayStatus | undefined,
  unitName: (id: string) => string,
): string {
  return Object.entries(status?.unitBlocks ?? {})
    .map(([id, title]) => (title ? `${unitName(id)}(${title})` : unitName(id)))
    .join(', ')
}
