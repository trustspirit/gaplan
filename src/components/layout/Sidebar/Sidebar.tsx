import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Calendar, MapPin, Users, CheckSquare, Settings, LogOut } from 'lucide-react'
import clsx from 'clsx'
import type { UserRole } from '@/types'
import { Avatar } from '@/components/ui'
import { signOut } from '@/services/authService'
import styles from './Sidebar.module.scss'

interface NavItem { to: string; icon: React.ReactNode; label: string; roles: UserRole[] }

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',  icon: <LayoutDashboard size={20} />, label: '대시보드', roles: ['admin','seventy','president'] },
  { to: '/calendar',   icon: <Calendar size={20} />,        label: '캘린더',   roles: ['admin','seventy','president'] },
  { to: '/visits',     icon: <MapPin size={20} />,          label: '방문',     roles: ['admin','seventy','president'] },
  { to: '/interviews', icon: <Users size={20} />,           label: '접견',     roles: ['admin','seventy','president'] },
  { to: '/tasks',      icon: <CheckSquare size={20} />,     label: 'Task',    roles: ['president'] },
  { to: '/admin',      icon: <Settings size={20} />,        label: '관리',     roles: ['admin'] },
]

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자 (집행서기)',
  seventy: '지역 칠십인',
  president: '스테이크/지방부 회장',
}

interface SidebarProps { role: UserRole; name: string; mobile?: boolean }

export function Sidebar({ role, name, mobile }: SidebarProps) {
  const items = NAV_ITEMS.filter(i => i.roles.includes(role))
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
    return (
      <nav className={styles.bottomNav}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(styles.tabItem, isActive && styles.active)}
          >
            {item.icon}
            <span className={styles.tabLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    )
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoText}>GP</span>
      </div>
      <nav className={styles.nav}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) => clsx(styles.navItem, isActive && styles.active)}
          >
            {item.icon}
          </NavLink>
        ))}
      </nav>
      <div className={styles.footer} ref={dropdownRef}>
        <button
          className={styles.avatarButton}
          onClick={() => setDropdownOpen(prev => !prev)}
          title="계정 메뉴"
          type="button"
        >
          <Avatar name={name} size="sm" />
        </button>
        {dropdownOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownName}>{name}</span>
              <span className={styles.dropdownRole}>{ROLE_LABELS[role]}</span>
            </div>
            <div className={styles.dropdownDivider} />
            <button className={styles.dropdownSignOut} onClick={handleSignOut} type="button">
              <LogOut size={14} />
              <span>로그아웃</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
