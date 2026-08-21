import { CalendarLinkCard } from './CalendarLinkCard'
import { AvailabilitySettings } from '@/pages/admin/AvailabilitySettings'
import { UserListCard } from './users/UserListCard'
import { InviteCard } from './users/InviteCard'
import { PreRegisterCard } from './users/PreRegisterCard'

/**
 * 설정 › 시스템. 스펙 §4.3 — 조직 전체에 영향을 주고, 대개 최초 1회 만지는 배선.
 * 관리자만 본다.
 *
 * 사용자 관리 카드 셋(UserListCard·InviteCard·PreRegisterCard)은 admin/UserManagement.tsx를
 * 갈라 옮겨왔다 — 그 파일은 아직 삭제하지 않았다(다음 태스크에서 지운다).
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
