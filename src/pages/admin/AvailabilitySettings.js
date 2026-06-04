import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { authUserAtom } from '@/store/authAtom';
import { useAvailability } from '@/hooks/useAvailability';
import { useUsers } from '@/hooks/useUsers';
import { saveAvailabilitySlots } from '@/services/availabilityService';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Select, Skeleton } from '@/components/ui';
import { AvailabilityEditor } from '@/components/domain';
import styles from './AvailabilitySettings.module.scss';
export function AvailabilitySettings() {
    const user = useAtomValue(authUserAtom);
    const { users } = useUsers();
    const seventies = users.filter(u => u.role === 'seventy');
    const [targetUid, setTargetUid] = useState('');
    const { slots, loading, error } = useAvailability(targetUid);
    const [saving, setSaving] = useState(false);
    const seventyOptions = seventies.map(s => ({ value: s.uid, label: s.name }));
    const handleSave = async (newSlots) => {
        if (!targetUid)
            return;
        setSaving(true);
        try {
            await saveAvailabilitySlots(targetUid, newSlots);
            toast.success('가능 일정이 저장되었습니다.');
        }
        catch {
            toast.error('저장에 실패했습니다.');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uAC00\uB2A5 \uC77C\uC815 \uC124\uC815" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uAC00\uB2A5 \uC77C\uC815 \uC124\uC815" }), _jsxs(CardBody, { children: [_jsx(Select, { label: "\uC9C0\uC5ED \uCE60\uC2ED\uC778 \uC120\uD0DD", value: targetUid, onChange: e => setTargetUid(e.target.value), options: seventyOptions }), targetUid && loading && _jsx(Skeleton, { height: "160px", className: styles.skeleton }), targetUid && error && (_jsx("p", { className: styles.error, children: "\uC2AC\uB86F \uB85C\uB529\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694." })), targetUid && !loading && !error && (_jsx(AvailabilityEditor, { slots: slots, onSave: handleSave, loading: saving }, targetUid))] })] }) }) }));
}
