import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Badge } from '@/components/ui';
import styles from './TopBar.module.scss';
export function TopBar({ name, subtext, pendingCount = 0 }) {
    return (_jsxs("header", { className: styles.topbar, children: [_jsxs("div", { children: [_jsxs("p", { className: styles.greeting, children: [name, "\uB2D8, \uC548\uB155\uD558\uC138\uC694"] }), subtext && _jsx("p", { className: styles.sub, children: subtext })] }), pendingCount > 0 && (_jsxs(Badge, { variant: "warning", children: ["\uCC98\uB9AC \uD544\uC694 ", pendingCount, "\uAC74"] }))] }));
}
