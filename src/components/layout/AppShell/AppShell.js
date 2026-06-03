import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from './AppShell.module.scss';
export function AppShell({ children, sidebar, topBar }) {
    return (_jsxs("div", { className: styles.shell, children: [_jsx("div", { className: styles.sidebar, children: sidebar }), _jsxs("div", { className: styles.main, children: [_jsx("div", { className: styles.topbar, children: topBar }), _jsx("main", { className: styles.content, children: children })] }), _jsx("div", { className: styles.bottomTab, children: sidebar })] }));
}
