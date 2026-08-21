import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut, Languages, MoreHorizontal } from 'lucide-react'
import clsx from 'clsx'
import type { UserRole } from '@/types'
import { Avatar, BottomSheet } from '@/components/ui'
import { signOut } from '@/services/authService'
import { LANGUAGES, type SupportedLang } from '@/i18n'
import { navItemsFor, type NavItemDef } from '@/components/layout/navItems'
import { NAV_ICONS } from './navIcons'
import { SidebarNav } from './SidebarNav'
import styles from './Sidebar.module.scss'

interface SidebarProps {
  role: UserRole
  name: string
  mobile?: boolean
}

export function Sidebar({ role, name, mobile }: SidebarProps) {
  const { t, i18n } = useTranslation()
  const items = navItemsFor(role)
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  async function handleSignOut() {
    setDropdownOpen(false)
    await signOut()
  }

  if (mobile) {
    const MAX_TABS = 5
    const renderTab = (item: NavItemDef) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => clsx(styles.tabItem, isActive && styles.active)}
      >
        {NAV_ICONS[item.id]}
        <span className={styles.tabLabel}>{t(item.labelKey)}</span>
      </NavLink>
    )

    if (items.length <= MAX_TABS) {
      return <nav className={styles.bottomNav}>{items.map(renderTab)}</nav>
    }

    const primary = items.slice(0, 4)
    const overflow = items.slice(4)
    const overflowActive = overflow.some(
      (i) => location.pathname === i.to || location.pathname.startsWith(i.to + '/'),
    )

    return (
      <>
        <nav className={styles.bottomNav}>
          {primary.map(renderTab)}
          <button
            type="button"
            className={clsx(styles.tabItem, overflowActive && styles.active)}
            onClick={() => setMoreOpen(true)}
          >
            <MoreHorizontal size={20} />
            <span className={styles.tabLabel}>{t('nav.more')}</span>
          </button>
        </nav>
        <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.more')}>
          <div className={styles.moreList}>
            {overflow.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={styles.moreItem}
                onClick={() => setMoreOpen(false)}
              >
                {NAV_ICONS[item.id]}
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </div>
        </BottomSheet>
      </>
    )
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/favicon.svg" alt="GA Plan" className={styles.logoImg} />
      </div>
      <SidebarNav role={role} />
      <div className={styles.footer} ref={dropdownRef}>
        <button
          className={styles.avatarButton}
          onClick={() => setDropdownOpen((prev) => !prev)}
          title={t('nav.accountMenu')}
          type="button"
        >
          <Avatar name={name} size="sm" />
        </button>
        {dropdownOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownName}>{name}</span>
              <span className={styles.dropdownRole}>{t(`role.${role}`)}</span>
            </div>
            <div className={styles.dropdownLangRow}>
              <Languages size={14} className={styles.dropdownLangIcon} />
              <div className={styles.dropdownLangBtns}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={clsx(
                      styles.langBtn,
                      i18n.language === lang.code && styles.langBtnActive,
                    )}
                    onClick={() => i18n.changeLanguage(lang.code as SupportedLang)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.dropdownDivider} />
            <button className={styles.dropdownSignOut} onClick={handleSignOut} type="button">
              <LogOut size={14} />
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
