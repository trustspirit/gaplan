import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { Link } from 'react-router-dom';
import { Users, ListChecks, CalendarCheck, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authUserAtom } from '@/store/authAtom';
import { AppShell, TopBar } from '@/components/layout';
import { Button } from '@/components/ui';
import styles from './AdminDashboard.module.scss';
const ACTION_CARD_DEFS = [
    { icon: Users, titleKey: 'admin.users', descKey: 'admin.inviteDesc', link: '/admin/users' },
    { icon: ListChecks, titleKey: 'admin.taskCreate', descKey: 'admin.taskCreateDesc', link: '/admin/tasks' },
    { icon: MapPin, titleKey: 'admin.visitPlanner', descKey: 'admin.visitPlannerDesc', link: '/admin/visit-planner' },
    { icon: CalendarCheck, titleKey: 'admin.calendar', descKey: 'admin.calendarDesc', link: '/admin/calendar' },
];
export function AdminDashboard() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: t('admin.dashboard') }), children: _jsx("div", { className: styles.page, children: _jsx("div", { className: styles.cardGrid, children: ACTION_CARD_DEFS.map(({ icon: Icon, titleKey, descKey, link }) => (_jsxs("div", { className: styles.actionCard, children: [_jsx("div", { className: styles.cardIcon, children: _jsx(Icon, { size: 28 }) }), _jsxs("div", { className: styles.cardContent, children: [_jsx("h3", { className: styles.cardTitle, children: t(titleKey) }), _jsx("p", { className: styles.cardDesc, children: t(descKey) })] }), _jsx(Link, { to: link, className: styles.cardAction, children: _jsx(Button, { variant: "secondary", fullWidth: true, children: t('common.goTo') }) })] }, link))) }) }) }));
}
