import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAtomValue } from 'jotai';
import { Link } from 'react-router-dom';
import { authUserAtom } from '@/store/authAtom';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Button } from '@/components/ui';
import styles from './AdminDashboard.module.scss';
export function AdminDashboard() {
    const user = useAtomValue(authUserAtom);
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uAD00\uB9AC \uBA54\uB274" }), _jsx(CardBody, { children: _jsxs("div", { className: styles.menu, children: [_jsx(Link, { to: "/admin/users", children: _jsx(Button, { variant: "secondary", fullWidth: true, children: "\uC0AC\uC6A9\uC790 \uAD00\uB9AC" }) }), _jsx(Link, { to: "/admin/tasks", children: _jsx(Button, { variant: "secondary", fullWidth: true, children: "Task \uC0DD\uC131" }) }), _jsx(Link, { to: "/admin/availability", children: _jsx(Button, { variant: "secondary", fullWidth: true, children: "\uAC00\uB2A5 \uC77C\uC815 \uC124\uC815" }) }), _jsx(Link, { to: "/admin/calendar", children: _jsx(Button, { variant: "secondary", fullWidth: true, children: "\uAD6C\uAE00 \uCE98\uB9B0\uB354 \uC5F0\uB3D9" }) })] }) })] }) }) }));
}
