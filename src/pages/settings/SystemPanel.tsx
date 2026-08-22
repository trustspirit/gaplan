import { useTranslation } from 'react-i18next'
import { CalendarLinkCard } from './CalendarLinkCard'
import { AvailabilitySettings } from './AvailabilitySettings'
import { UserListCard } from './users/UserListCard'
import { InviteCard } from './users/InviteCard'
import { PreRegisterCard } from './users/PreRegisterCard'
import styles from './SystemPanel.module.scss'

/**
 * 설정 › 시스템. 스펙 §4.3 — 조직 전체에 영향을 주고, 대개 최초 1회 만지는 배선.
 * 관리자만 본다.
 */
export function SystemPanel() {
  const { t } = useTranslation()
  return (
    <>
      <CalendarLinkCard />
      <AvailabilitySettings />

      {/* UserListCard·InviteCard·PreRegisterCard 셋 다 구성원 관리라는 같은 주제다.
          각 컴포넌트를 뜯어고치지 않고 감싸는 층에서만 그룹임을 드러낸다. */}
      <div className={styles.memberGroup}>
        <h2 className={styles.memberGroupTitle}>{t('settings.system.membersTitle')}</h2>
        <UserListCard />
        <InviteCard />
        <PreRegisterCard />
      </div>
    </>
  )
}
