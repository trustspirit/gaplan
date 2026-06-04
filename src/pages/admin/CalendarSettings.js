import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { authUserAtom } from '@/store/authAtom';
import { manualCalendarSync } from '@/services/scheduleService';
import { db } from '@/firebase';
import { REGIONS } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Input, Button } from '@/components/ui';
import styles from './CalendarSettings.module.scss';
export function CalendarSettings() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    const [calendarIds, setCalendarIds] = useState({});
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
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
            toast.success(t('admin.calendarSaved'));
        }
        catch {
            toast.error(t('common.saveFailed'));
        }
        finally {
            setLoading(false);
        }
    };
    const handleManualSync = async () => {
        setSyncing(true);
        try {
            const result = await manualCalendarSync();
            toast.success(result.message);
        }
        catch (e) {
            toast.error(e?.message ?? '동기화 오류가 발생했습니다.');
        }
        finally {
            setSyncing(false);
        }
    };
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: t('admin.calendar') }), children: _jsxs("div", { className: styles.page, children: [_jsxs(Card, { children: [_jsx(CardHeader, { title: t('admin.calendar') }), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: "\uAC01 \uC9C0\uC5ED\uBCC4\uB85C \uACF5\uC720 \uCE98\uB9B0\uB354\uB97C \uC0DD\uC131\uD558\uACE0, Google Calendar \uC124\uC815\uC5D0\uC11C \uCE98\uB9B0\uB354 ID\uB97C \uBCF5\uC0AC\uD574 \uC785\uB825\uD558\uC138\uC694. \uD655\uC815\uB41C \uC77C\uC815\uC774 \uD574\uB2F9 \uC9C0\uC5ED \uCE98\uB9B0\uB354\uC5D0 \uC790\uB3D9\uC73C\uB85C \uAE30\uB85D\uB429\uB2C8\uB2E4." }), fetching ? (_jsx("p", { className: styles.desc, children: "\uBD88\uB7EC\uC624\uB294 \uC911..." })) : (_jsxs("form", { className: styles.form, onSubmit: handleSave, children: [REGIONS.map(region => (_jsx(Input, { label: `${region.name} 지역 캘린더 ID`, value: calendarIds[region.id] ?? '', onChange: e => setCalendarIds(prev => ({ ...prev, [region.id]: e.target.value })), placeholder: "xxxxxxxx@group.calendar.google.com" }, region.id))), _jsx(Button, { type: "submit", loading: loading, children: "\uC800\uC7A5" })] }))] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC218\uB3D9 \uCE98\uB9B0\uB354 \uB3D9\uAE30\uD654" }), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: "\uCE98\uB9B0\uB354 \uB4F1\uB85D\uC774 \uC2E4\uD328\uD55C \uD655\uC815 \uC77C\uC815\uB4E4\uC744 Google Calendar\uC5D0 \uB2E4\uC2DC \uB3D9\uAE30\uD654\uD569\uB2C8\uB2E4. (googleCalendarEventId\uAC00 \uC5C6\uB294 confirmed \uC77C\uC815 \uB300\uC0C1)" }), _jsxs(Button, { onClick: handleManualSync, loading: syncing, variant: "secondary", children: [_jsx(RefreshCw, { size: 14 }), "\u00A0\uC9C0\uAE08 \uB3D9\uAE30\uD654"] })] })] })] }) }));
}
