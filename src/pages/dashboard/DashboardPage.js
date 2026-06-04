import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import { Calendar, CheckCircle2 } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { authUserAtom } from '@/store/authAtom';
import { useTasks } from '@/hooks/useTasks';
import { useSchedules } from '@/hooks/useSchedules';
import { useUnits } from '@/hooks/useUnits';
import { useTaskConfirm } from '@/hooks/useTaskConfirm';
import { useIsMobile } from '@/hooks/useIsMobile';
import { subscribeToSharedCalendar } from '@/services/calendarService';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Skeleton, Button, Modal, BottomSheet } from '@/components/ui';
import { TaskCard, ScheduleItem, CalendarView, TaskPickerContent, taskPickerTitle } from '@/components/domain';
import { useWardSubmit } from '@/hooks/useWardSubmit';
import { REGIONS } from '@/constants/regions';
import styles from './DashboardPage.module.scss';
function CalendarBanner({ connected }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const handleConnect = async () => {
        setLoading(true);
        try {
            await subscribeToSharedCalendar();
            toast.success(t('schedule.calendarSuccess'));
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : '연동에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: styles.calendarBanner, children: [_jsx(Calendar, { size: 16, color: "var(--color-primary, #177C9C)" }), _jsx("span", { className: styles.calendarBannerText, children: t('schedule.calendarBannerText') }), connected ? (_jsxs("div", { className: styles.calendarConnected, children: [_jsx(CheckCircle2, { size: 14 }), t('schedule.calendarConnected')] })) : (_jsx(Button, { variant: "secondary", size: "sm", onClick: handleConnect, loading: loading, children: t('schedule.calendarSubscribe') }))] }));
}
function PresidentDashboard() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    const { tasks, loading: tasksLoading } = useTasks(user.uid);
    const { schedules, loading: schedulesLoading } = useSchedules({ presidentUid: user.uid });
    const { getUnitName } = useUnits();
    const isMobile = useIsMobile();
    const { activeTask, selectedSlot: _selectedSlot, selectedSlots, toggleSlot, isSlotSelected, submitting, availableSlots, openTask, closeTask, handleSubmitAvailability, } = useTaskConfirm(user.uid, user.unitId);
    const { handleSubmitWards, wardSubmitting } = useWardSubmit(activeTask, closeTask);
    const upcoming = schedules
        .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);
    const pickerTitle = taskPickerTitle(activeTask);
    const pickerContent = activeTask ? (_jsx(TaskPickerContent, { activeTask: activeTask, user: user, availableSlots: availableSlots, isSlotSelected: isSlotSelected, onToggleSlot: toggleSlot, slotSubmitting: submitting, selectedSlots: selectedSlots, onSubmitAvailability: handleSubmitAvailability, onSubmitWards: handleSubmitWards, wardSubmitting: wardSubmitting })) : null;
    return (_jsxs(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: dayjs().format('YYYY년 M월'), pendingCount: tasks.length }), children: [_jsxs("div", { className: styles.layout, children: [_jsxs("div", { className: styles.mainCol, children: [_jsxs(Card, { children: [_jsx(CardHeader, { title: t('task.needsAction') }), _jsx(CardBody, { children: tasksLoading
                                            ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                            : tasks.length === 0
                                                ? _jsx("p", { className: styles.empty, children: t('task.noTasks') })
                                                : tasks.map(t => _jsx(TaskCard, { task: t, onAction: openTask }, t.id)) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: t('schedule.upcoming') }), _jsx(CardBody, { children: schedulesLoading
                                            ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                            : upcoming.length === 0
                                                ? _jsx("p", { className: styles.empty, children: t('schedule.noUpcoming') })
                                                : upcoming.map(s => (_jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId), showCalendarAdd: true }, s.id))) })] })] }), _jsx("div", { className: styles.sideCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: t('nav.calendar') }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules }) })] }) })] }), isMobile ? (_jsx(BottomSheet, { open: !!activeTask, onClose: closeTask, title: pickerTitle, children: pickerContent })) : (_jsx(Modal, { open: !!activeTask, onClose: closeTask, title: pickerTitle, children: pickerContent }))] }));
}
function SeventyDashboard() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    const { schedules } = useSchedules({ seventyUid: user.uid });
    const { getUnitName } = useUnits();
    const regionName = REGIONS.find(r => r.id === user.regionId)?.name ?? user.regionId ?? '';
    const upcoming = schedules
        .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10);
    const thisMonthCount = schedules.filter(s => s.status === 'confirmed' && dayjs(s.date).format('YYYY-M') === dayjs().format('YYYY-M')).length;
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: regionName }), children: _jsxs("div", { className: styles.layout, children: [_jsxs("div", { className: styles.mainCol, children: [_jsx(CalendarBanner, { connected: user.calendarConnected }), _jsxs(Card, { children: [_jsx(CardHeader, { title: t('schedule.upcoming'), action: _jsx("span", { style: { fontSize: '0.8125rem', color: '#808081' }, children: t('schedule.thisMonth', { count: thisMonthCount }) }) }), _jsx(CardBody, { children: upcoming.length === 0
                                        ? _jsx("p", { className: styles.empty, children: t('schedule.noUpcoming') })
                                        : upcoming.map(s => (_jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId) }, s.id))) })] })] }), _jsx("div", { className: styles.sideCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: t('nav.calendar') }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules }) })] }) })] }) }));
}
function AdminDashboardContent() {
    const { t } = useTranslation();
    const user = useAtomValue(authUserAtom);
    const { schedules } = useSchedules({});
    const thisMonth = schedules.filter(s => s.status === 'confirmed' && dayjs(s.date).format('YYYY-M') === dayjs().format('YYYY-M'));
    const upcoming = schedules
        .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8);
    const { getUnitName } = useUnits();
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: t('admin.dashboard') }), children: _jsxs("div", { className: styles.layout, children: [_jsx("div", { className: styles.mainCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: t('schedule.upcoming'), action: _jsx("span", { style: { fontSize: '0.8125rem', color: '#808081' }, children: t('schedule.thisMonth', { count: thisMonth.length }) }) }), _jsx(CardBody, { children: upcoming.length === 0
                                    ? _jsx("p", { className: styles.empty, children: t('schedule.noUpcoming') })
                                    : upcoming.map(s => (_jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId) }, s.id))) })] }) }), _jsx("div", { className: styles.sideCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: t('nav.calendar') }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules }) })] }) })] }) }));
}
export function DashboardPage() {
    const user = useAtomValue(authUserAtom);
    if (user.role === 'seventy')
        return _jsx(SeventyDashboard, {});
    if (user.role === 'admin')
        return _jsx(AdminDashboardContent, {});
    return _jsx(PresidentDashboard, {});
}
