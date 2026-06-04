import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
import { LogOut, Pencil, Languages } from 'lucide-react';
import { useAtom } from 'jotai';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Badge, Avatar } from '@/components/ui';
import { signOut } from '@/services/authService';
import { updateUserName } from '@/services/userService';
import { authUserAtom } from '@/store/authAtom';
import { LANGUAGES } from '@/i18n';
import styles from './TopBar.module.scss';
function EditNameRow({ onDone }) {
    const [user, setUser] = useAtom(authUserAtom);
    const { t } = useTranslation();
    const [value, setValue] = useState(user?.name ?? '');
    const [saving, setSaving] = useState(false);
    const handleSave = async () => {
        if (!user || !value.trim())
            return;
        setSaving(true);
        try {
            await updateUserName(user.uid, value.trim());
            setUser({ ...user, name: value.trim() });
            toast.success(t('auth.nameSaved'));
            onDone();
        }
        catch {
            toast.error(t('auth.nameSaveFailed'));
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: styles.editNameRow, children: [_jsx("input", { className: styles.editNameInput, value: value, onChange: e => setValue(e.target.value), onKeyDown: e => { if (e.key === 'Enter')
                    handleSave(); }, autoFocus: true, maxLength: 30 }), _jsx("button", { type: "button", className: styles.editNameSave, onClick: handleSave, disabled: saving, children: saving ? '…' : '저장' })] }));
}
export function TopBar({ name, subtext, pendingCount = 0 }) {
    const { t, i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        function close(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setEditingName(false);
            }
        }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);
    return (_jsxs("header", { className: styles.topbar, children: [_jsxs("div", { className: styles.textGroup, children: [_jsx("p", { className: styles.greeting, children: t('auth.greeting', { name }) }), subtext && _jsx("p", { className: styles.sub, children: subtext })] }), _jsxs("div", { className: styles.right, children: [pendingCount > 0 && (_jsxs(Badge, { variant: "warning", children: ["\uCC98\uB9AC \uD544\uC694 ", pendingCount, "\uAC74"] })), _jsxs("div", { className: styles.avatarWrap, ref: ref, children: [_jsx("button", { type: "button", className: styles.avatarBtn, onClick: () => { setOpen(v => !v); setEditingName(false); }, "aria-label": "\uACC4\uC815 \uBA54\uB274", children: _jsx(Avatar, { name: name, size: "sm" }) }), open && (_jsxs("div", { className: styles.dropdown, children: [_jsx("div", { className: styles.dropdownUser, children: _jsx("span", { className: styles.dropdownName, children: name }) }), editingName ? (_jsx(EditNameRow, { onDone: () => { setEditingName(false); setOpen(false); } })) : (_jsxs("button", { type: "button", className: styles.dropdownItem, onClick: () => setEditingName(true), children: [_jsx(Pencil, { size: 14 }), t('auth.changeName')] })), _jsx("div", { className: styles.dropdownDivider }), _jsxs("div", { className: styles.dropdownLangRow, children: [_jsx(Languages, { size: 14, className: styles.dropdownLangIcon }), _jsx("div", { className: styles.dropdownLangBtns, children: LANGUAGES.map(lang => (_jsx("button", { type: "button", className: clsx(styles.langBtn, i18n.language === lang.code && styles.langBtnActive), onClick: () => i18n.changeLanguage(lang.code), children: lang.label }, lang.code))) })] }), _jsx("div", { className: styles.dropdownDivider }), _jsxs("button", { type: "button", className: styles.dropdownItem, onClick: () => { setOpen(false); signOut(); }, children: [_jsx(LogOut, { size: 14 }), t('auth.logout')] })] }))] })] })] }));
}
