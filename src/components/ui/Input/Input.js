import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './Input.module.scss';
export function Input({ label, error, className, id, ...props }) {
    const inputId = id ?? label;
    return (_jsxs("div", { className: styles.wrapper, children: [label && _jsx("label", { htmlFor: inputId, className: styles.label, children: label }), _jsx("input", { id: inputId, className: clsx(styles.input, error && styles.error, className), ...props }), error && _jsx("span", { className: styles.errorMsg, children: error })] }));
}
