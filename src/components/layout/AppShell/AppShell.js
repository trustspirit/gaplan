import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sidebar } from '@/components/layout/Sidebar/Sidebar';
import styles from './AppShell.module.scss';
export function AppShell({ children, role, name, topBar }) {
    return (_jsxs("div", { className: styles.shell, children: [_jsx("div", { className: styles.sidebar, children: _jsx(Sidebar, { role: role, name: name }) }), _jsxs("div", { className: styles.main, children: [_jsx("div", { className: styles.topbar, children: topBar }), _jsx("main", { className: styles.content, children: children })] }), _jsx("div", { className: styles.bottomTab, children: _jsx(Sidebar, { role: role, name: name, mobile: true }) })] }));
}
