import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, MapPin, Users, CheckSquare, Settings } from 'lucide-react';
import clsx from 'clsx';
import { Avatar } from '@/components/ui';
import styles from './Sidebar.module.scss';
const NAV_ITEMS = [
    { to: '/dashboard', icon: _jsx(LayoutDashboard, { size: 20 }), label: '대시보드', roles: ['admin', 'seventy', 'president'] },
    { to: '/calendar', icon: _jsx(Calendar, { size: 20 }), label: '캘린더', roles: ['admin', 'seventy', 'president'] },
    { to: '/visits', icon: _jsx(MapPin, { size: 20 }), label: '방문', roles: ['admin', 'seventy', 'president'] },
    { to: '/interviews', icon: _jsx(Users, { size: 20 }), label: '접견', roles: ['admin', 'seventy', 'president'] },
    { to: '/tasks', icon: _jsx(CheckSquare, { size: 20 }), label: 'Task', roles: ['president'] },
    { to: '/admin', icon: _jsx(Settings, { size: 20 }), label: '관리', roles: ['admin'] },
];
export function Sidebar({ role, name, mobile }) {
    const items = NAV_ITEMS.filter(i => i.roles.includes(role));
    if (mobile) {
        return (_jsx("nav", { className: styles.bottomNav, children: items.map(item => (_jsxs(NavLink, { to: item.to, className: ({ isActive }) => clsx(styles.tabItem, isActive && styles.active), children: [item.icon, _jsx("span", { className: styles.tabLabel, children: item.label })] }, item.to))) }));
    }
    return (_jsxs("aside", { className: styles.sidebar, children: [_jsx("div", { className: styles.logo, children: _jsx("div", { className: styles.logoIcon }) }), _jsx("nav", { className: styles.nav, children: items.map(item => (_jsx(NavLink, { to: item.to, title: item.label, className: ({ isActive }) => clsx(styles.navItem, isActive && styles.active), children: item.icon }, item.to))) }), _jsx("div", { className: styles.footer, children: _jsx(Avatar, { name: name, size: "sm" }) })] }));
}
