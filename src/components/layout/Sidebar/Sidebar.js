import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, MapPin, Users, CheckSquare, Settings, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { Avatar } from '@/components/ui';
import { signOut } from '@/services/authService';
import styles from './Sidebar.module.scss';
const NAV_ITEMS = [
    { to: '/dashboard', icon: _jsx(LayoutDashboard, { size: 20 }), label: '대시보드', roles: ['admin', 'seventy', 'president'] },
    { to: '/calendar', icon: _jsx(Calendar, { size: 20 }), label: '캘린더', roles: ['admin', 'seventy', 'president'] },
    { to: '/visits', icon: _jsx(MapPin, { size: 20 }), label: '방문', roles: ['admin', 'seventy', 'president'] },
    { to: '/interviews', icon: _jsx(Users, { size: 20 }), label: '접견', roles: ['admin', 'seventy', 'president'] },
    { to: '/tasks', icon: _jsx(CheckSquare, { size: 20 }), label: 'Task', roles: ['president'] },
    { to: '/admin', icon: _jsx(Settings, { size: 20 }), label: '관리', roles: ['admin'] },
];
const ROLE_LABELS = {
    admin: '관리자 (집행서기)',
    seventy: '지역 칠십인',
    president: '스테이크/지방부 회장',
};
export function Sidebar({ role, name, mobile }) {
    const items = NAV_ITEMS.filter(i => i.roles.includes(role));
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    useEffect(() => {
        if (!dropdownOpen)
            return;
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownOpen]);
    async function handleSignOut() {
        setDropdownOpen(false);
        await signOut();
    }
    if (mobile) {
        return (_jsx("nav", { className: styles.bottomNav, children: items.map(item => (_jsxs(NavLink, { to: item.to, className: ({ isActive }) => clsx(styles.tabItem, isActive && styles.active), children: [item.icon, _jsx("span", { className: styles.tabLabel, children: item.label })] }, item.to))) }));
    }
    return (_jsxs("aside", { className: styles.sidebar, children: [_jsx("div", { className: styles.logo, children: _jsx("span", { className: styles.logoText, children: "GP" }) }), _jsx("nav", { className: styles.nav, children: items.map(item => (_jsx(NavLink, { to: item.to, title: item.label, className: ({ isActive }) => clsx(styles.navItem, isActive && styles.active), children: item.icon }, item.to))) }), _jsxs("div", { className: styles.footer, ref: dropdownRef, children: [_jsx("button", { className: styles.avatarButton, onClick: () => setDropdownOpen(prev => !prev), title: "\uACC4\uC815 \uBA54\uB274", type: "button", children: _jsx(Avatar, { name: name, size: "sm" }) }), dropdownOpen && (_jsxs("div", { className: styles.dropdown, children: [_jsxs("div", { className: styles.dropdownHeader, children: [_jsx("span", { className: styles.dropdownName, children: name }), _jsx("span", { className: styles.dropdownRole, children: ROLE_LABELS[role] })] }), _jsx("div", { className: styles.dropdownDivider }), _jsxs("button", { className: styles.dropdownSignOut, onClick: handleSignOut, type: "button", children: [_jsx(LogOut, { size: 14 }), _jsx("span", { children: "\uB85C\uADF8\uC544\uC6C3" })] })] }))] })] }));
}
