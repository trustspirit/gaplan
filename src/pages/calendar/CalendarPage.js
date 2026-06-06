import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import { X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { authUserAtom } from '@/store/authAtom';
import { useSchedules } from '@/hooks/useSchedules';
import { useUnits } from '@/hooks/useUnits';
import { manualCalendarSync } from '@/services/scheduleService';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Button } from '@/components/ui';
import { CalendarView, ScheduleItem, ScheduleFormModal } from '@/components/domain';
import styles from './CalendarPage.module.scss';
export function CalendarPage() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    const [selectedDate, setSelectedDate] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
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
    const { getUnitName } = useUnits();
    const filters = user.role === 'president'
        ? { presidentUid: user.uid }
        : user.role === 'seventy'
            ? { seventyUid: user.uid }
            : {};
    const { schedules } = useSchedules(filters);
    // Toggle: clicking the same date again deselects it
    const handleDateClick = (date) => {
        setSelectedDate(prev => prev === date ? null : date);
    };
    const daySchedules = selectedDate
        ? schedules.filter(s => s.status === 'confirmed' && s.date === selectedDate)
        : schedules
            .filter(s => s.status === 'confirmed' && s.date >= dayjs().format('YYYY-MM-DD'))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 10);
    const listTitle = selectedDate
        ? t('calendar.selectedDateTitle', { date: dayjs(selectedDate).format('M/D (ddd)') })
        : t('calendar.upcomingTitle');
    return (_jsxs(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: t('calendar.subtext') }), children: [_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.layout, children: [_jsx("div", { className: styles.calendarCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: t('calendar.title'), action: 
                                        // Admin can manually re-sync schedules to Google Calendar
                                        user.role === 'admin' ? (_jsx(Button, { variant: "ghost", size: "sm", onClick: handleManualSync, loading: syncing, title: t('calendar.syncTitle'), children: _jsx(RefreshCw, { size: 14 }) })) : undefined }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules, onDateClick: handleDateClick, selectedDate: selectedDate, getUnitName: getUnitName }) })] }) }), _jsx("div", { className: styles.listCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: listTitle, action: selectedDate ? (_jsxs("div", { className: styles.headerActions, children: [user.role === 'admin' && (_jsx(Button, { variant: "primary", size: "sm", onClick: () => setFormOpen(true), children: "+ \uC77C\uC815 \uCD94\uAC00" })), _jsx("button", { type: "button", className: styles.clearBtn, onClick: () => setSelectedDate(null), title: t('calendar.clearSelection'), children: _jsx(X, { size: 14 }) })] })) : undefined }), _jsx(CardBody, { children: daySchedules.length === 0
                                            ? _jsx("p", { className: styles.empty, children: t('calendar.noSchedule') })
                                            : daySchedules.map(s => (_jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId), showCalendarAdd: user.role === 'president' }, s.id))) })] }) })] }) }), formOpen && (_jsx(ScheduleFormModal, { initialDate: selectedDate ?? undefined, onClose: () => setFormOpen(false), onSaved: () => { setFormOpen(false); toast.success('일정이 등록되었습니다.'); } }))] }));
}
