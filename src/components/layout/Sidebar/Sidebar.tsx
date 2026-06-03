import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Calendar, MapPin, Users, CheckSquare, Settings } from 'lucide-react'
import clsx from 'clsx'
import type { UserRole } from '@/types'
import { Avatar } from '@/components/ui'
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

interface SidebarProps { role: UserRole; name: string; mobile?: boolean }

export function Sidebar({ role, name, mobile }: SidebarProps) {
  const items = NAV_ITEMS.filter(i => i.roles.includes(role))

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
        <div className={styles.logoIcon} />
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
      <div className={styles.footer}>
        <Avatar name={name} size="sm" />
      </div>
    </aside>
  )
}
