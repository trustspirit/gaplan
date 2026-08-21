import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LogOut, Languages } from 'lucide-react'
import clsx from 'clsx'
import type { UserRole } from '@/types'
import { Avatar } from '@/components/ui'
import { signOut } from '@/services/authService'
import { LANGUAGES, type SupportedLang } from '@/i18n'
import { usePendingTaskCount } from '@/hooks/usePendingTaskCount'
import { MobileTabs } from './MobileTabs'
import { SidebarNav } from './SidebarNav'
import styles from './Sidebar.module.scss'

interface SidebarProps {
  role: UserRole
  name: string
  mobile?: boolean
}

export function Sidebar({ role, name, mobile }: SidebarProps) {
  const { t, i18n } = useTranslation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pendingTaskCount = usePendingTaskCount()

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
    return <MobileTabs role={role} pendingTaskCount={pendingTaskCount} />
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/favicon.svg" alt="GA Plan" className={styles.logoImg} />
      </div>
      <SidebarNav role={role} pendingTaskCount={pendingTaskCount} />
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
