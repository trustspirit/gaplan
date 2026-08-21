import { CalendarLinkCard } from './CalendarLinkCard'
import { AvailabilitySettings } from './AvailabilitySettings'
import { UserListCard } from './users/UserListCard'
import { InviteCard } from './users/InviteCard'
import { PreRegisterCard } from './users/PreRegisterCard'

/**
 * 설정 › 시스템. 스펙 §4.3 — 조직 전체에 영향을 주고, 대개 최초 1회 만지는 배선.
 * 관리자만 본다.
 */
export function SystemPanel() {
  return (
    <>
      <CalendarLinkCard />
      <AvailabilitySettings />
      <UserListCard />
      <InviteCard />
      <PreRegisterCard />
    </>
  )
}
