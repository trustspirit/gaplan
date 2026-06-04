import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { Link } from 'react-router-dom';
import { Users, ListChecks, CalendarCheck, MapPin } from 'lucide-react';
import { authUserAtom } from '@/store/authAtom';
import { AppShell, TopBar } from '@/components/layout';
import { Button } from '@/components/ui';
import styles from './AdminDashboard.module.scss';
const ACTION_CARDS = [
    {
        icon: Users,
        title: '사용자 관리',
        desc: '초대 및 역할 관리',
        link: '/admin/users',
    },
    {
        icon: ListChecks,
        title: 'Task 생성',
        desc: '스테이크/지방부 회장에게 Task 할당',
        link: '/admin/tasks',
    },
    {
        icon: MapPin,
        title: '방문 일정 계획',
        desc: '와드/지부별 방문 일요일 배정',
        link: '/admin/visit-planner',
    },
    {
        icon: CalendarCheck,
        title: '구글 캘린더',
        desc: '공유 캘린더 연동 설정',
        link: '/admin/calendar',
    },
];
export function AdminDashboard() {
    const user = useAtomValue(authUserAtom);
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC" }), children: _jsx("div", { className: styles.page, children: _jsx("div", { className: styles.cardGrid, children: ACTION_CARDS.map(({ icon: Icon, title, desc, link }) => (_jsxs("div", { className: styles.actionCard, children: [_jsx("div", { className: styles.cardIcon, children: _jsx(Icon, { size: 28 }) }), _jsxs("div", { className: styles.cardContent, children: [_jsx("h3", { className: styles.cardTitle, children: title }), _jsx("p", { className: styles.cardDesc, children: desc })] }), _jsx(Link, { to: link, className: styles.cardAction, children: _jsx(Button, { variant: "secondary", fullWidth: true, children: "\uBC14\uB85C \uAC00\uAE30" }) })] }, link))) }) }) }));
}
