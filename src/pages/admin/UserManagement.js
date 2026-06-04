import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { authUserAtom } from '@/store/authAtom';
import { inviteUser } from '@/services/userService';
import { useUsers } from '@/hooks/useUsers';
import { REGIONS } from '@/constants/regions';
import { ROLE_LABELS } from '@/constants/roles';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Input, Select, Button, Badge, Avatar, Skeleton } from '@/components/ui';
import styles from './UserManagement.module.scss';
const ROLE_OPTIONS = ['admin', 'seventy', 'president'].map(r => ({ value: r, label: ROLE_LABELS[r] }));
const REGION_OPTIONS = REGIONS.map(r => ({ value: r.id, label: r.name }));
export function UserManagement() {
    const user = useAtomValue(authUserAtom);
    const { users, loading: usersLoading } = useUsers();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('president');
    const [regionId, setRegionId] = useState('');
    const [loading, setLoading] = useState(false);
    const handleInvite = async (e) => {
        e.preventDefault();
        if (!email.trim())
            return;
        setLoading(true);
        try {
            await inviteUser(email.trim(), role, role === 'seventy' ? regionId : undefined, user.uid);
            toast.success(`${email}을 초대했습니다.`);
            setEmail('');
            setRegionId('');
        }
        catch {
            toast.error('초대에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uC0AC\uC6A9\uC790 \uAD00\uB9AC" }), children: _jsxs("div", { className: styles.page, children: [_jsx("div", { className: styles.inviteCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC0AC\uC6A9\uC790 \uCD08\uB300" }), _jsx(CardBody, { children: _jsxs("form", { className: styles.form, onSubmit: handleInvite, children: [_jsx(Input, { label: "\uC774\uBA54\uC77C", type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "example@gmail.com", required: true }), _jsx(Select, { label: "\uC5ED\uD560", value: role, onChange: e => setRole(e.target.value), options: ROLE_OPTIONS }), role === 'seventy' && (_jsx(Select, { label: "\uB2F4\uB2F9 \uC9C0\uC5ED", value: regionId, onChange: e => setRegionId(e.target.value), options: REGION_OPTIONS })), _jsx(Button, { type: "submit", loading: loading, children: "\uCD08\uB300 \uBC1C\uC1A1" })] }) })] }) }), _jsx("div", { className: styles.listCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC804\uCCB4 \uC0AC\uC6A9\uC790" }), _jsx(CardBody, { children: usersLoading
                                    ? [1, 2, 3].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonRow }, i))
                                    : users.map(u => (_jsxs("div", { className: styles.userRow, children: [_jsx(Avatar, { name: u.name, size: "sm" }), _jsxs("div", { className: styles.userInfo, children: [_jsx("p", { className: styles.userName, children: u.name }), _jsx("p", { className: styles.userEmail, children: u.email })] }), _jsx(Badge, { variant: u.role === 'admin' ? 'danger' : u.role === 'seventy' ? 'warning' : 'default', children: ROLE_LABELS[u.role] })] }, u.uid))) })] }) })] }) }));
}
