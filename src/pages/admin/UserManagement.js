import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
    const [name, setName] = useState(user.name);
    const [role, setRole] = useState(user.role);
    const [regionId, setRegionId] = useState(user.regionId ?? '');
    const [loading, setLoading] = useState(false);
    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const tasks = [];
            if (name.trim() !== user.name)
                tasks.push(updateUserName(user.uid, name.trim()));
            if (role !== user.role || (role === 'seventy' && regionId !== user.regionId)) {
                tasks.push(updateUserRole(user.uid, role, role === 'seventy' ? regionId : undefined));
            }
            await Promise.all(tasks);
            toast.success(`${name}의 정보가 변경되었습니다.`);
            onClose();
        }
        catch {
            toast.error('변경에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Modal, { open: true, onClose: onClose, title: `사용자 편집 — ${user.name}`, children: _jsxs("form", { className: styles.editForm, onSubmit: handleSave, children: [_jsx(Input, { label: "\uC774\uB984", value: name, onChange: e => setName(e.target.value), required: true }), _jsx(Select, { label: "\uC5ED\uD560", value: role, onChange: e => setRole(e.target.value), options: ROLE_OPTIONS }), role === 'seventy' && (_jsx(Select, { label: "\uB2F4\uB2F9 \uC9C0\uC5ED", value: regionId, onChange: e => setRegionId(e.target.value), options: REGION_OPTIONS })), _jsxs("div", { className: styles.modalActions, children: [_jsx(Button, { variant: "ghost", type: "button", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "submit", loading: loading, children: "\uC800\uC7A5" })] })] }) }));
}
function DeleteConfirmModal({ user, onClose, onDeleted, }) {
    const [loading, setLoading] = useState(false);
    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteUserAccount(user.uid);
            toast.success(`${user.name} 계정이 삭제되었습니다.`);
            onDeleted();
            onClose();
        }
        catch {
            toast.error('삭제에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(Modal, { open: true, onClose: onClose, title: "\uC0AC\uC6A9\uC790 \uC0AD\uC81C", children: [_jsxs("p", { className: styles.deleteDesc, children: [_jsx("strong", { children: user.name }), " (", user.email, ") \uACC4\uC815\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", _jsx("br", {}), "\uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."] }), _jsxs("div", { className: styles.modalActions, children: [_jsx(Button, { variant: "ghost", type: "button", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { variant: "danger", loading: loading, onClick: handleDelete, children: "\uC0AD\uC81C" })] })] }));
}
export function UserManagement() {
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
            toast.success(`${email}을 초대했습니다.`);
            setEmail('');
            setRegionId('');
        }
        catch {
            toast.error('초대에 실패했습니다.');
        }
        finally {
            setInviteLoading(false);
        }
    };
    return (_jsxs(AppShell, { role: currentUser.role, name: currentUser.name, topBar: _jsx(TopBar, { name: currentUser.name, subtext: "\uC0AC\uC6A9\uC790 \uAD00\uB9AC" }), children: [_jsxs("div", { className: styles.page, children: [_jsx("div", { className: styles.inviteCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC0AC\uC6A9\uC790 \uCD08\uB300" }), _jsx(CardBody, { children: _jsxs("form", { className: styles.form, onSubmit: handleInvite, children: [_jsx(Input, { label: "\uC774\uBA54\uC77C", type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "example@gmail.com", required: true }), _jsx(Select, { label: "\uC5ED\uD560", value: role, onChange: e => setRole(e.target.value), options: ROLE_OPTIONS }), role === 'seventy' && (_jsx(Select, { label: "\uB2F4\uB2F9 \uC9C0\uC5ED", value: regionId, onChange: e => setRegionId(e.target.value), options: REGION_OPTIONS })), _jsx(Button, { type: "submit", loading: inviteLoading, children: "\uCD08\uB300 \uBC1C\uC1A1" })] }) })] }) }), _jsx("div", { className: styles.listCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC804\uCCB4 \uC0AC\uC6A9\uC790" }), _jsx(CardBody, { children: usersLoading
                                        ? [1, 2, 3].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonRow }, i))
                                        : users.map(u => (_jsxs("div", { className: styles.userRow, children: [_jsx(Avatar, { name: u.name, size: "sm" }), _jsxs("div", { className: styles.userInfo, children: [_jsx("p", { className: styles.userName, children: u.name }), _jsx("p", { className: styles.userEmail, children: u.email })] }), _jsx(Badge, { variant: u.role === 'admin' ? 'danger' : u.role === 'seventy' ? 'warning' : 'default', children: ROLE_LABELS[u.role] }), _jsxs("div", { className: styles.userActions, children: [_jsx("button", { className: styles.iconBtn, title: "\uC5ED\uD560 \uBCC0\uACBD", type: "button", onClick: () => setEditingUser(u), children: _jsx(Pencil, { size: 14 }) }), u.uid !== currentUser.uid && (_jsx("button", { className: `${styles.iconBtn} ${styles.iconBtnDanger}`, title: "\uC0AD\uC81C", type: "button", onClick: () => setDeletingUser(u), children: _jsx(Trash2, { size: 14 }) }))] })] }, u.uid))) })] }) })] }), editingUser && (_jsx(EditUserModal, { user: editingUser, onClose: () => setEditingUser(null) })), deletingUser && (_jsx(DeleteConfirmModal, { user: deletingUser, onClose: () => setDeletingUser(null), onDeleted: () => setDeletingUser(null) }))] }));
}
