import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './Badge.module.scss';
export function Badge({ variant = 'default', children, className }) {
    return _jsx("span", { className: clsx(styles.badge, styles[variant], className), children: children });
}
