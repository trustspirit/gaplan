import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { authUserAtom } from '@/store/authAtom';
import { useTasks } from '@/hooks/useTasks';
import { useSchedules } from '@/hooks/useSchedules';
import { useUnits } from '@/hooks/useUnits';
import { useTaskConfirm } from '@/hooks/useTaskConfirm';
import { useIsMobile } from '@/hooks/useIsMobile';
import { subscribeToSharedCalendar } from '@/services/calendarService';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Skeleton, Button, Modal, BottomSheet } from '@/components/ui';
import { TaskCard, ScheduleItem, CalendarView, TimeSlotPicker, VisitDatePicker } from '@/components/domain';
import { REGIONS } from '@/constants/regions';
import styles from './DashboardPage.module.scss';
function CalendarBanner({ connected }) {
    const [loading, setLoading] = useState(false);
    const handleConnect = async () => {
        setLoading(true);
        try {
            await subscribeToSharedCalendar();
            toast.success('구글 캘린더에 구독되었습니다!');
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : '연동에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: styles.calendarBanner, children: [_jsx(Calendar, { size: 16, color: "var(--color-primary, #177C9C)" }), _jsx("span", { className: styles.calendarBannerText, children: "\uAD6C\uAE00 \uCE98\uB9B0\uB354 \uAD6C\uB3C5\uC73C\uB85C \uBAA8\uB4E0 \uD655\uC815 \uC77C\uC815\uC744 \uD578\uB4DC\uD3F0\uC5D0\uC11C \uBC14\uB85C \uD655\uC778\uD558\uC138\uC694." }), connected ? (_jsxs("div", { className: styles.calendarConnected, children: [_jsx(CheckCircle2, { size: 14 }), "\uAD6C\uB3C5 \uC644\uB8CC"] })) : (_jsx(Button, { variant: "secondary", size: "sm", onClick: handleConnect, loading: loading, children: "\uAD6C\uB3C5" }))] }));
}
function PresidentDashboard() {
    const user = useAtomValue(authUserAtom);
    const { tasks, loading: tasksLoading } = useTasks(user.uid);
    const { schedules, loading: schedulesLoading } = useSchedules({ presidentUid: user.uid });
    const { getUnitName } = useUnits();
    const isMobile = useIsMobile();
    const { activeTask, selectedSlot, setSelectedSlot, selectedSlots, toggleSlot, isSlotSelected, submitting, availableSlots, isVisit, isMultiSelect, openTask, closeTask, handleConfirm, handleSubmitAvailability, } = useTaskConfirm(user.uid, user.unitId);
    const upcoming = schedules
        .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);
    const slotPickerContent = (_jsxs(_Fragment, { children: [isVisit ? (_jsx(VisitDatePicker, { slots: availableSlots, selected: selectedSlot, onSelect: setSelectedSlot })) : (_jsx(TimeSlotPicker, { slots: availableSlots, granularity: "time", multiSelect: true, isSlotSelected: isSlotSelected, onToggle: toggleSlot })), isMultiSelect ? (_jsxs(Button, { onClick: handleSubmitAvailability, loading: submitting, disabled: selectedSlots.length === 0, fullWidth: true, className: styles.confirmBtn, children: ["\uAC00\uB2A5 \uC2DC\uAC04 \uC81C\uCD9C ", selectedSlots.length > 0 ? `(${selectedSlots.length}개)` : ''] })) : (_jsx(Button, { onClick: handleConfirm, loading: submitting, disabled: !selectedSlot, fullWidth: true, className: styles.confirmBtn, children: "\uBC29\uBB38 \uC77C\uC815 \uD655\uC815" }))] }));
    return (_jsxs(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: dayjs().format('YYYY년 M월'), pendingCount: tasks.length }), children: [_jsxs("div", { className: styles.layout, children: [_jsxs("div", { className: styles.mainCol, children: [_jsx(CalendarBanner, { connected: user.calendarConnected }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uCC98\uB9AC \uD544\uC694" }), _jsx(CardBody, { children: tasksLoading
                                            ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                            : tasks.length === 0
                                                ? _jsx("p", { className: styles.empty, children: "\uCC98\uB9AC\uD560 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                                : tasks.map(t => _jsx(TaskCard, { task: t, onAction: openTask }, t.id)) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC608\uC815 \uC77C\uC815" }), _jsx(CardBody, { children: schedulesLoading
                                            ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                            : upcoming.length === 0
                                                ? _jsx("p", { className: styles.empty, children: "\uC608\uC815\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                                : upcoming.map(s => (_jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId) }, s.id))) })] })] }), _jsx("div", { className: styles.sideCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uCE98\uB9B0\uB354" }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules }) })] }) })] }), isMobile ? (_jsx(BottomSheet, { open: !!activeTask, onClose: closeTask, title: isVisit ? '방문 날짜 선택' : isMultiSelect ? '가능한 시간 선택 (복수 가능)' : '날짜/시간 선택', children: slotPickerContent })) : (_jsx(Modal, { open: !!activeTask, onClose: closeTask, title: isVisit ? '방문 날짜 선택' : isMultiSelect ? '가능한 시간 선택 (복수 가능)' : '날짜/시간 선택', children: slotPickerContent }))] }));
}
function SeventyDashboard() {
    const user = useAtomValue(authUserAtom);
    const { schedules } = useSchedules({ seventyUid: user.uid });
    const { getUnitName } = useUnits();
    const regionName = REGIONS.find(r => r.id === user.regionId)?.name ?? user.regionId ?? '';
    const upcoming = schedules
        .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10);
    const thisMonthCount = schedules.filter(s => s.status === 'confirmed' && dayjs(s.date).format('YYYY-M') === dayjs().format('YYYY-M')).length;
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: regionName }), children: _jsxs("div", { className: styles.layout, children: [_jsxs("div", { className: styles.mainCol, children: [_jsx(CalendarBanner, { connected: user.calendarConnected }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC608\uC815 \uC77C\uC815", action: _jsxs("span", { style: { fontSize: '0.8125rem', color: '#808081' }, children: ["\uC774\uBC88 \uB2EC ", thisMonthCount, "\uAC74"] }) }), _jsx(CardBody, { children: upcoming.length === 0
                                        ? _jsx("p", { className: styles.empty, children: "\uC608\uC815\uB41C \uD655\uC815 \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                        : upcoming.map(s => (_jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId) }, s.id))) })] })] }), _jsx("div", { className: styles.sideCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uCE98\uB9B0\uB354" }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules }) })] }) })] }) }));
}
function AdminDashboardContent() {
    const user = useAtomValue(authUserAtom);
    const { schedules } = useSchedules({});
    const thisMonth = schedules.filter(s => s.status === 'confirmed' && dayjs(s.date).format('YYYY-M') === dayjs().format('YYYY-M'));
    const upcoming = schedules
        .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 8);
    const { getUnitName } = useUnits();
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC" }), children: _jsxs("div", { className: styles.layout, children: [_jsx("div", { className: styles.mainCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC804\uCCB4 \uC608\uC815 \uC77C\uC815", action: _jsxs("span", { style: { fontSize: '0.8125rem', color: '#808081' }, children: ["\uC774\uBC88 \uB2EC ", thisMonth.length, "\uAC74"] }) }), _jsx(CardBody, { children: upcoming.length === 0
                                    ? _jsx("p", { className: styles.empty, children: "\uC608\uC815\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                    : upcoming.map(s => (_jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId) }, s.id))) })] }) }), _jsx("div", { className: styles.sideCol, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uCE98\uB9B0\uB354" }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules }) })] }) })] }) }));
}
export function DashboardPage() {
    const user = useAtomValue(authUserAtom);
    if (user.role === 'seventy')
        return _jsx(SeventyDashboard, {});
    if (user.role === 'admin')
        return _jsx(AdminDashboardContent, {});
    return _jsx(PresidentDashboard, {});
}
