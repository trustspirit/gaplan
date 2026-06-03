import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './Spinner.module.scss';
export function Spinner({ className }) {
    return _jsx("div", { className: clsx(styles.spinner, className), role: "status", "aria-label": "\uB85C\uB529 \uC911" });
}
