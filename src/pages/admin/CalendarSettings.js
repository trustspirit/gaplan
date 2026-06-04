import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { authUserAtom } from '@/store/authAtom';
import { db } from '@/firebase';
import { REGIONS } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Input, Button } from '@/components/ui';
import styles from './CalendarSettings.module.scss';
export function CalendarSettings() {
    const user = useAtomValue(authUserAtom);
    const [calendarIds, setCalendarIds] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    useEffect(() => {
        getDoc(doc(db, 'settings', 'calendar')).then(snap => {
            const data = snap.data();
            if (data?.calendars)
                setCalendarIds(data.calendars);
        }).finally(() => setFetching(false));
    }, []);
    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await setDoc(doc(db, 'settings', 'calendar'), { calendars: calendarIds }, { merge: true });
            toast.success('구글 캘린더가 저장되었습니다.');
        }
        catch {
            toast.error('저장에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uAD6C\uAE00 \uCE98\uB9B0\uB354 \uC5F0\uB3D9" }), children: _jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC9C0\uC5ED\uBCC4 \uAD6C\uAE00 \uCE98\uB9B0\uB354 \uC5F0\uB3D9" }), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: "\uAC01 \uC9C0\uC5ED\uBCC4\uB85C \uACF5\uC720 \uCE98\uB9B0\uB354\uB97C \uC0DD\uC131\uD558\uACE0, Google Calendar \uC124\uC815\uC5D0\uC11C \uCE98\uB9B0\uB354 ID\uB97C \uBCF5\uC0AC\uD574 \uC785\uB825\uD558\uC138\uC694. \uD655\uC815\uB41C \uC77C\uC815\uC774 \uD574\uB2F9 \uC9C0\uC5ED \uCE98\uB9B0\uB354\uC5D0 \uC790\uB3D9\uC73C\uB85C \uAE30\uB85D\uB429\uB2C8\uB2E4." }), fetching ? (_jsx("p", { className: styles.desc, children: "\uBD88\uB7EC\uC624\uB294 \uC911..." })) : (_jsxs("form", { className: styles.form, onSubmit: handleSave, children: [REGIONS.map(region => (_jsx(Input, { label: `${region.name} 지역 캘린더 ID`, value: calendarIds[region.id] ?? '', onChange: e => setCalendarIds(prev => ({ ...prev, [region.id]: e.target.value })), placeholder: "xxxxxxxx@group.calendar.google.com" }, region.id))), _jsx(Button, { type: "submit", loading: loading, children: "\uC800\uC7A5" })] }))] })] }) }) }));
}
