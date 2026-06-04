import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { authUserAtom } from '@/store/authAtom';
import { inviteUser, updateUserRole, updateUserName, deleteUserAccount } from '@/services/userService';
import { useUsers } from '@/hooks/useUsers';
import { REGIONS } from '@/constants/regions';
import { ROLE_LABELS } from '@/constants/roles';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Input, Select, Button, Badge, Avatar, Skeleton, Modal } from '@/components/ui';
import styles from './UserManagement.module.scss';
const ROLE_OPTIONS = ['admin', 'seventy', 'president'].map(r => ({ value: r, label: ROLE_LABELS[r] }));
const REGION_OPTIONS = REGIONS.map(r => ({ value: r.id, label: r.name }));
function EditUserModal({ user, onClose, }) {
    const { t } = useTranslation();
    const [name, setName] = useState(user.name);
    const [role, setRole] = useState(user.role);
    // Multi-region support for seventy
    const [selectedRegions, setSelectedRegions] = useState(new Set(user.regionIds ?? (user.regionId ? [user.regionId] : [])));
    const [loading, setLoading] = useState(false);
    function toggleRegion(regionId) {
        setSelectedRegions(prev => {
            const next = new Set(prev);
            next.has(regionId) ? next.delete(regionId) : next.add(regionId);
            return next;
        });
    }
    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const tasks = [];
            if (name.trim() !== user.name)
                tasks.push(updateUserName(user.uid, name.trim()));
            const newRegionIds = Array.from(selectedRegions);
            const regionChanged = role === 'seventy' && (JSON.stringify(newRegionIds.sort()) !== JSON.stringify((user.regionIds ?? []).sort()));
            if (role !== user.role || regionChanged) {
                tasks.push(updateUserRole(user.uid, role, role === 'seventy' ? newRegionIds : undefined));
            }
            await Promise.all(tasks);
            toast.success(`${name}${t('user.editSuccess')}`);
            onClose();
        }
        catch {
            toast.error(t('user.editFailed'));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Modal, { open: true, onClose: onClose, title: `${t('user.editUser')} — ${user.name}`, children: _jsxs("form", { className: styles.editForm, onSubmit: handleSave, children: [_jsx(Input, { label: t('user.name'), value: name, onChange: e => setName(e.target.value), required: true }), _jsx(Select, { label: t('user.role'), value: role, onChange: e => setRole(e.target.value), options: ROLE_OPTIONS }), role === 'seventy' && (_jsxs("div", { className: styles.regionCheckGroup, children: [_jsxs("p", { className: styles.regionCheckLabel, children: [t('user.inviteRegion'), " (\uBCF5\uC218 \uC120\uD0DD \uAC00\uB2A5)"] }), _jsx("div", { className: styles.regionCheckList, children: REGIONS.map(r => (_jsxs("label", { className: styles.regionCheckRow, children: [_jsx("input", { type: "checkbox", checked: selectedRegions.has(r.id), onChange: () => toggleRegion(r.id), className: styles.regionCheckbox, style: { accentColor: 'var(--color-primary, #177C9C)' } }), _jsx("span", { className: styles.regionCheckName, children: r.name })] }, r.id))) })] })), _jsxs("div", { className: styles.modalActions, children: [_jsx(Button, { variant: "ghost", type: "button", onClick: onClose, children: t('common.cancel') }), _jsx(Button, { type: "submit", loading: loading, children: t('common.save') })] })] }) }));
}
function DeleteConfirmModal({ user, onClose, onDeleted, }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteUserAccount(user.uid);
            toast.success(t('user.deleteSuccess'));
            onDeleted();
            onClose();
        }
        catch {
            toast.error(t('user.deleteFailed'));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(Modal, { open: true, onClose: onClose, title: t('user.deleteUser'), children: [_jsxs("p", { className: styles.deleteDesc, children: [_jsx("strong", { children: user.name }), " (", user.email, ") ", t('user.deleteConfirm'), _jsx("br", {}), t('user.deleteWarning')] }), _jsxs("div", { className: styles.modalActions, children: [_jsx(Button, { variant: "ghost", type: "button", onClick: onClose, children: t('common.cancel') }), _jsx(Button, { variant: "danger", loading: loading, onClick: handleDelete, children: t('common.delete') })] })] }));
}
export function UserManagement() {
    const { t } = useTranslation();
    const currentUser = useAtomValue(authUserAtom);
    const { users, loading: usersLoading } = useUsers();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('president');
    const [regionId, setRegionId] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    // editingUser replaces the old EditRoleModal
    const [deletingUser, setDeletingUser] = useState(null);
    const handleInvite = async (e) => {
        e.preventDefault();
        if (!email.trim())
            return;
        setInviteLoading(true);
        try {
            await inviteUser(email.trim(), role, role === 'seventy' ? regionId : undefined, currentUser.uid);
            toast.success(`${email}${t('user.inviteSuccess')}`);
            setEmail('');
            setRegionId('');
        }
        catch {
            toast.error(t('user.inviteFailed'));
        }
        finally {
            setInviteLoading(false);
        }
    };
    return (_jsxs(AppShell, { role: currentUser.role, name: currentUser.name, topBar: _jsx(TopBar, { name: currentUser.name, subtext: t('admin.users') }), children: [_jsxs("div", { className: styles.page, children: [_jsx("div", { className: styles.inviteCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: t('user.invite') }), _jsx(CardBody, { children: _jsxs("form", { className: styles.form, onSubmit: handleInvite, children: [_jsx(Input, { label: t('user.inviteEmail'), type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "example@gmail.com", required: true }), _jsx(Select, { label: t('user.inviteRole'), value: role, onChange: e => setRole(e.target.value), options: ROLE_OPTIONS }), role === 'seventy' && (_jsx(Select, { label: t('user.inviteRegion'), value: regionId, onChange: e => setRegionId(e.target.value), options: REGION_OPTIONS })), _jsx(Button, { type: "submit", loading: inviteLoading, children: t('user.inviteSend') })] }) })] }) }), _jsx("div", { className: styles.listCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: t('user.allUsers') }), _jsx(CardBody, { children: usersLoading
                                        ? [1, 2, 3].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonRow }, i))
                                        : users.map(u => (_jsxs("div", { className: styles.userRow, children: [_jsx(Avatar, { name: u.name, size: "sm" }), _jsxs("div", { className: styles.userInfo, children: [_jsx("p", { className: styles.userName, children: u.name }), _jsx("p", { className: styles.userEmail, children: u.email })] }), _jsx(Badge, { variant: u.role === 'admin' ? 'danger' : u.role === 'seventy' ? 'warning' : 'default', children: ROLE_LABELS[u.role] }), _jsxs("div", { className: styles.userActions, children: [_jsx("button", { className: styles.iconBtn, title: "\uC5ED\uD560 \uBCC0\uACBD", type: "button", onClick: () => setEditingUser(u), children: _jsx(Pencil, { size: 14 }) }), u.uid !== currentUser.uid && (_jsx("button", { className: `${styles.iconBtn} ${styles.iconBtnDanger}`, title: "\uC0AD\uC81C", type: "button", onClick: () => setDeletingUser(u), children: _jsx(Trash2, { size: 14 }) }))] })] }, u.uid))) })] }) })] }), editingUser && (_jsx(EditUserModal, { user: editingUser, onClose: () => setEditingUser(null) })), deletingUser && (_jsx(DeleteConfirmModal, { user: deletingUser, onClose: () => setDeletingUser(null), onDeleted: () => setDeletingUser(null) }))] }));
}
