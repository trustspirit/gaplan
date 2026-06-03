import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './Card.module.scss';
export function Card({ children, className, ...props }) {
    return _jsx("div", { className: clsx(styles.card, className), ...props, children: children });
}
export function CardHeader({ title, action }) {
    return _jsxs("div", { className: styles.header, children: [_jsx("span", { className: styles.title, children: title }), action] });
}
export function CardBody({ children, className }) {
    return _jsx("div", { className: clsx(styles.body, className), children: children });
}
