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
import { settingsTabBySlug, settingsTabsFor } from './settingsTabs'
import styles from './SettingsPage.module.scss'

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

  useTopBar({ subtext: t('settings.subtext') })

  if (!active) {
    if (tabs.length === 0) return <ForbiddenState />
    return <Navigate to={tabs[0].path} replace />
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t('settings.title')} />

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
