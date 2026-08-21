import { useMemo } from 'react'
import { Navigate, NavLink, useParams } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { useTranslation } from 'react-i18next'
import { authUserAtom } from '@/store/authAtom'
import { useTopBar } from '@/hooks/useTopBar'
import { ForbiddenState, PageHeader, Tabs } from '@/components/ui'
import { SystemPanel } from './SystemPanel'
import { SharingPanel } from './SharingPanel'
import { AccountPanel } from './AccountPanel'
import { settingsTabBySlug, settingsTabsFor, type SettingsTabId } from './settingsTabs'
import styles from './SettingsPage.module.scss'

// 탭마다 상단바 도움말이 다르다. sharing·account엔 아직 키가 없다 — helpInfoKey는
// optional이라 undefined면 그냥 도움말 버튼이 안 뜬다. PlansPage.tsx의 HELP_KEY와 같은 패턴.
const HELP_KEY: Partial<Record<SettingsTabId, string>> = {
  system: 'pageHelp.users',
}

// 최종 리뷰 FIX 7 — 세 하위 화면 전부 'settings.title'("설정") 하나만 보여줬다.
// 로케일에 이미 있던 title 키를 여기서 처음 쓴다.
const SUB_TITLE_KEY: Record<SettingsTabId, string> = {
  system: 'settings.system.title',
  sharing: 'settings.sharing.title',
  account: 'settings.account.title',
}

/**
 * 설정. 스펙 §4.2 — 좌측 하위 내비를 가진 섹션이고, 각 항목은 카드가 아니라
 * 독립 화면이다. 역할마다 보이는 화면이 다르다(판정 R47).
 */
export function SettingsPage() {
  const { t } = useTranslation()
  const user = useAtomValue(authUserAtom)!
  const { tab: slug } = useParams<{ tab: string }>()

  const tabs = useMemo(() => settingsTabsFor(user.role), [user.role])
  const active = settingsTabBySlug(user.role, slug)

  // 훅은 조건부 반환보다 먼저 전부 부른다.
  useTopBar({
    subtext: t('settings.subtext'),
    helpInfoKey: active ? HELP_KEY[active.id] : undefined,
  })

  if (!active) {
    if (tabs.length === 0) return <ForbiddenState />
    return <Navigate to={tabs[0].path} replace />
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t('settings.title')} description={t(SUB_TITLE_KEY[active.id])} />

      {/* 판정 R34 — 화면이 하나뿐인 역할에게는 내비를 그리지 않는다. */}
      {tabs.length > 1 && (
        <Tabs
          className={styles.nav}
          items={tabs.map((x) => ({ id: x.id, label: t(x.labelKey), href: x.path }))}
          activeId={active.id}
          aria-label={t('settings.navLabel')}
          renderLink={(item, children, props) => (
            <NavLink to={item.href!} {...props}>
              {children}
            </NavLink>
          )}
        />
      )}

      {active.id === 'system' && <SystemPanel />}
      {active.id === 'sharing' && <SharingPanel />}
      {active.id === 'account' && <AccountPanel />}
    </div>
  )
}
