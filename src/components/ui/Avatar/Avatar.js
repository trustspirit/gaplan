import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './Avatar.module.scss';
export function Avatar({ name, size = 'md', className }) {
    return _jsx("div", { className: clsx(styles.avatar, styles[size], className), children: name.slice(0, 1) });
}
