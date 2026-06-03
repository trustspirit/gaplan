import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.scss';
export function Button({ variant = 'primary', size = 'md', loading, fullWidth, children, disabled, className, ...props }) {
    return (_jsxs("button", { className: clsx(styles.button, styles[variant], styles[size], fullWidth && styles.fullWidth, className), disabled: disabled || loading, ...props, children: [loading && _jsx(Loader2, { className: styles.spinner, size: 14 }), children] }));
}
