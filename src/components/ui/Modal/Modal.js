import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import styles from './Modal.module.scss';
export function Modal({ open, onClose, title, children, className }) {
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => { if (e.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open)
        return null;
    return createPortal(_jsx("div", { className: styles.overlay, onClick: onClose, role: "dialog", "aria-modal": true, children: _jsxs("div", { className: clsx(styles.modal, className), onClick: e => e.stopPropagation(), children: [title && (_jsxs("div", { className: styles.header, children: [_jsx("h2", { className: styles.title, children: title }), _jsx("button", { onClick: onClose, className: styles.close, "aria-label": "\uB2EB\uAE30", children: _jsx(X, { size: 18 }) })] })), _jsx("div", { className: styles.body, children: children })] }) }), document.body);
}
