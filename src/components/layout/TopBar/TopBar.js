import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Avatar } from '@/components/ui';
import { signOut } from '@/services/authService';
import styles from './TopBar.module.scss';
export function TopBar({ name, subtext, pendingCount = 0 }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        function close(e) {
            if (ref.current && !ref.current.contains(e.target))
                setOpen(false);
        }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);
    return (_jsxs("header", { className: styles.topbar, children: [_jsxs("div", { className: styles.textGroup, children: [_jsxs("p", { className: styles.greeting, children: [name, "\uB2D8, \uC548\uB155\uD558\uC138\uC694"] }), subtext && _jsx("p", { className: styles.sub, children: subtext })] }), _jsxs("div", { className: styles.right, children: [pendingCount > 0 && (_jsxs(Badge, { variant: "warning", children: ["\uCC98\uB9AC \uD544\uC694 ", pendingCount, "\uAC74"] })), _jsxs("div", { className: styles.avatarWrap, ref: ref, children: [_jsx("button", { type: "button", className: styles.avatarBtn, onClick: () => setOpen(v => !v), "aria-label": "\uACC4\uC815 \uBA54\uB274", children: _jsx(Avatar, { name: name, size: "sm" }) }), open && (_jsxs("div", { className: styles.dropdown, children: [_jsx("div", { className: styles.dropdownUser, children: _jsx("span", { className: styles.dropdownName, children: name }) }), _jsx("div", { className: styles.dropdownDivider }), _jsxs("button", { type: "button", className: styles.dropdownItem, onClick: () => { setOpen(false); signOut(); }, children: [_jsx(LogOut, { size: 14 }), "\uB85C\uADF8\uC544\uC6C3"] })] }))] })] })] }));
}
