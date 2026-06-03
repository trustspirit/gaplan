import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { authUserAtom } from '@/store/authAtom';
import { db } from '@/firebase';
import { AppShell, Sidebar, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Input, Button } from '@/components/ui';
import styles from './CalendarSettings.module.scss';
export function CalendarSettings() {
    const user = useAtomValue(authUserAtom);
    const [calendarId, setCalendarId] = useState('');
    const [loading, setLoading] = useState(false);
    const handleSave = async (e) => {
        e.preventDefault();
        if (!calendarId.trim())
            return;
        setLoading(true);
        try {
            await setDoc(doc(db, 'settings', 'calendar'), { sharedCalendarId: calendarId.trim() });
            toast.success('구글 캘린더가 등록되었습니다.');
        }
        catch {
            toast.error('저장에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AppShell, { sidebar: _jsx(Sidebar, { role: user.role, name: user.name }), topBar: _jsx(TopBar, { name: user.name, subtext: "\uAD6C\uAE00 \uCE98\uB9B0\uB354 \uC5F0\uB3D9" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uAD6C\uAE00 \uCE98\uB9B0\uB354 \uC5F0\uB3D9" }), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: "Google Calendar\uC5D0\uC11C \uACF5\uC720 \uCE98\uB9B0\uB354\uB97C \uC0DD\uC131\uD558\uACE0, \uCE98\uB9B0\uB354 \uC124\uC815\uC5D0\uC11C \uCE98\uB9B0\uB354 ID\uB97C \uBCF5\uC0AC\uD574 \uBD99\uC5EC\uB123\uC73C\uC138\uC694. \uD655\uC815\uB41C \uBAA8\uB4E0 \uC77C\uC815\uC774 \uD574\uB2F9 \uCE98\uB9B0\uB354\uC5D0 \uC790\uB3D9\uC73C\uB85C \uAE30\uB85D\uB429\uB2C8\uB2E4." }), _jsxs("form", { className: styles.form, onSubmit: handleSave, children: [_jsx(Input, { label: "\uCE98\uB9B0\uB354 ID", value: calendarId, onChange: e => setCalendarId(e.target.value), placeholder: "xxxxxxxx@group.calendar.google.com" }), _jsx(Button, { type: "submit", loading: loading, children: "\uC800\uC7A5" })] })] })] }) }) }));
}
