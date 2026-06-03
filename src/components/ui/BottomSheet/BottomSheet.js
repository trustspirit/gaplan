import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import styles from './BottomSheet.module.scss';
export function BottomSheet({ open, onClose, title, children }) {
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);
    return createPortal(_jsx("div", { className: clsx(styles.overlay, open && styles.open), onClick: onClose, children: _jsxs("div", { className: clsx(styles.sheet, open && styles.sheetOpen), onClick: e => e.stopPropagation(), children: [_jsx("div", { className: styles.handle }), title && (_jsxs("div", { className: styles.header, children: [_jsx("h2", { className: styles.title, children: title }), _jsx("button", { onClick: onClose, className: styles.close, "aria-label": "\uB2EB\uAE30", children: _jsx(X, { size: 18 }) })] })), _jsx("div", { className: styles.body, children: children })] }) }), document.body);
}
