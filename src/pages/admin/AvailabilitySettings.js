import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { authUserAtom } from '@/store/authAtom';
import { useAvailability } from '@/hooks/useAvailability';
import { saveAvailabilitySlots } from '@/services/availabilityService';
import { AppShell, Sidebar, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody } from '@/components/ui';
import { AvailabilityEditor } from '@/components/domain';
import styles from './AvailabilitySettings.module.scss';
export function AvailabilitySettings() {
    const user = useAtomValue(authUserAtom);
    const targetUid = user.uid;
    const { slots, loading } = useAvailability(targetUid);
    const [saving, setSaving] = useState(false);
    const handleSave = async (newSlots) => {
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
    return (_jsx(AppShell, { sidebar: _jsx(Sidebar, { role: user.role, name: user.name }), topBar: _jsx(TopBar, { name: user.name, subtext: "\uAC00\uB2A5 \uC77C\uC815 \uC124\uC815" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uAC00\uB2A5 \uC77C\uC815 \uC124\uC815" }), _jsx(CardBody, { children: !loading && _jsx(AvailabilityEditor, { slots: slots, onSave: handleSave, loading: saving }) })] }) }) }));
}
