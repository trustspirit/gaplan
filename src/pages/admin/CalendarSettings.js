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
        getDoc(doc(db, 'settings', 'calendar'))
            .then((snap) => {
            const data = snap.data();
            if (data?.calendars)
                setCalendarIds(data.calendars);
        })
            .finally(() => setFetching(false));
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
            toast.error(e?.message ?? t('common.syncError'));
        }
        finally {
            setSyncing(false);
        }
    };
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: t('admin.calendar') }), children: _jsxs("div", { className: styles.page, children: [_jsxs(Card, { children: [_jsx(CardHeader, { title: t('admin.calendar') }), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: t('admin.calendarDesc2') }), fetching ? (_jsx("p", { className: styles.desc, children: t('common.loading') })) : (_jsxs("form", { className: styles.form, onSubmit: handleSave, children: [REGIONS.map((region) => (_jsx(Input, { label: `${region.name} ${t('admin.calendarRegionLabel')}`, value: calendarIds[region.id] ?? '', onChange: (e) => setCalendarIds((prev) => ({ ...prev, [region.id]: e.target.value })), placeholder: "xxxxxxxx@group.calendar.google.com" }, region.id))), _jsx(Button, { type: "submit", loading: loading, children: t('common.save') })] }))] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: t('calendar.syncCardTitle') }), _jsxs(CardBody, { children: [_jsx("p", { className: styles.desc, children: t('calendar.syncCardDesc') }), _jsxs(Button, { onClick: handleManualSync, loading: syncing, variant: "secondary", children: [_jsx(RefreshCw, { size: 14 }), "\u00A0", t('calendar.syncManual')] })] })] })] }) }));
}
