import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './Select.module.scss';
export function Select({ label, error, options, className, id, ...props }) {
    const selectId = id ?? label;
    return (_jsxs("div", { className: styles.wrapper, children: [label && _jsx("label", { htmlFor: selectId, className: styles.label, children: label }), _jsxs("select", { id: selectId, className: clsx(styles.select, error && styles.error, className), ...props, children: [_jsx("option", { value: "", children: "\uC120\uD0DD\uD558\uC138\uC694" }), options.map(o => _jsx("option", { value: o.value, children: o.label }, o.value))] }), error && _jsx("span", { className: styles.errorMsg, children: error })] }));
}
