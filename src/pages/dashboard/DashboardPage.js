import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import dayjs from 'dayjs';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { authUserAtom } from '@/store/authAtom';
import { taskModalOpenAtom, selectedTaskAtom } from '@/store/uiAtom';
import { useTasks } from '@/hooks/useTasks';
import { useSchedules } from '@/hooks/useSchedules';
import { useUnits } from '@/hooks/useUnits';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Skeleton, Button } from '@/components/ui';
import { TaskCard, ScheduleItem, CalendarView } from '@/components/domain';
import { subscribeToSharedCalendar } from '@/services/calendarService';
import styles from './DashboardPage.module.scss';
function CalendarConnectCard({ connected }) {
    const [loading, setLoading] = useState(false);
    const handleConnect = async () => {
        setLoading(true);
        try {
            await subscribeToSharedCalendar();
            toast.success('구글 캘린더에 구독되었습니다! 핸드폰 캘린더에도 자동으로 나타납니다.');
        }
        catch (err) {
            toast.error(err instanceof Error ? err.message : '연동에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    if (connected) {
        return (_jsxs("div", { className: styles.calendarConnected, children: [_jsx(Calendar, { size: 14 }), _jsx("span", { children: "\uAD6C\uAE00 \uCE98\uB9B0\uB354 \uAD6C\uB3C5 \uC644\uB8CC" })] }));
    }
    return (_jsxs(Button, { variant: "secondary", size: "sm", onClick: handleConnect, loading: loading, children: [_jsx(Calendar, { size: 14 }), "\uAD6C\uAE00 \uCE98\uB9B0\uB354 \uAD6C\uB3C5"] }));
}
function PresidentDashboard() {
    const user = useAtomValue(authUserAtom);
    const setTaskModal = useSetAtom(taskModalOpenAtom);
    const setSelectedTask = useSetAtom(selectedTaskAtom);
    const { tasks, loading: tasksLoading } = useTasks(user.uid);
    const { schedules, loading: schedulesLoading } = useSchedules({ presidentUid: user.uid });
    const { getUnitName } = useUnits();
    const upcoming = schedules
        .filter(s => s.status === 'confirmed' && dayjs(s.date).isAfter(dayjs().subtract(1, 'day')))
        .slice(0, 3);
    const handleTaskAction = (task) => {
        setSelectedTask(task);
        setTaskModal(true);
    };
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: dayjs().format('YYYY년 M월'), pendingCount: tasks.length }), children: _jsxs("div", { className: styles.grid, children: [_jsxs(Card, { className: styles.calendarConnectCard, children: [_jsx(CardHeader, { title: "\uAD6C\uAE00 \uCE98\uB9B0\uB354", action: _jsx(CalendarConnectCard, { connected: user.calendarConnected }) }), _jsx(CardBody, { children: _jsx("p", { className: styles.calendarDesc, children: "\uAD6C\uB3C5\uD558\uBA74 \uBAA8\uB4E0 \uD655\uC815 \uC77C\uC815\uC774 \uD578\uB4DC\uD3F0 \uBC0F Google \uCE98\uB9B0\uB354\uC5D0 \uC790\uB3D9\uC73C\uB85C \uB098\uD0C0\uB0A9\uB2C8\uB2E4." }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uCC98\uB9AC \uD544\uC694" }), _jsx(CardBody, { children: tasksLoading
                                ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                : tasks.length === 0
                                    ? _jsx("p", { className: styles.empty, children: "\uCC98\uB9AC\uD560 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                    : tasks.map(t => _jsx(TaskCard, { task: t, onAction: handleTaskAction }, t.id)) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uD655\uC815 \uC77C\uC815" }), _jsx(CardBody, { children: schedulesLoading
                                ? [1, 2].map(i => _jsx(Skeleton, { height: "44px", className: styles.skeletonItem }, i))
                                : upcoming.length === 0
                                    ? _jsx("p", { className: styles.empty, children: "\uC608\uC815\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                    : upcoming.map(s => _jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId) }, s.id)) })] }), _jsxs(Card, { className: styles.calendarCard, children: [_jsx(CardHeader, { title: "\uCE98\uB9B0\uB354" }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules }) })] })] }) }));
}
function SeventyDashboard() {
    const user = useAtomValue(authUserAtom);
    const { schedules } = useSchedules({ seventyUid: user.uid });
    const { getUnitName } = useUnits();
    const thisMonth = schedules.filter(s => s.status === 'confirmed' && dayjs(s.date).month() === dayjs().month());
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: user.regionId }), children: _jsxs("div", { className: styles.grid, children: [_jsxs(Card, { className: styles.calendarConnectCard, children: [_jsx(CardHeader, { title: "\uAD6C\uAE00 \uCE98\uB9B0\uB354", action: _jsx(CalendarConnectCard, { connected: user.calendarConnected }) }), _jsx(CardBody, { children: _jsx("p", { className: styles.calendarDesc, children: "\uAD6C\uB3C5\uD558\uBA74 \uBAA8\uB4E0 \uD655\uC815 \uC77C\uC815\uC774 \uD578\uB4DC\uD3F0 \uBC0F Google \uCE98\uB9B0\uB354\uC5D0 \uC790\uB3D9\uC73C\uB85C \uB098\uD0C0\uB0A9\uB2C8\uB2E4." }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uC774\uBC88 \uB2EC \uC77C\uC815" }), _jsx(CardBody, { children: thisMonth.length === 0
                                ? _jsx("p", { className: styles.empty, children: "\uC774\uBC88 \uB2EC \uD655\uC815 \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })
                                : thisMonth.map(s => _jsx(ScheduleItem, { schedule: s, unitName: getUnitName(s.unitId) }, s.id)) })] }), _jsxs(Card, { className: styles.calendarCard, children: [_jsx(CardHeader, { title: "\uCE98\uB9B0\uB354" }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules }) })] })] }) }));
}
function AdminDashboardContent() {
    const user = useAtomValue(authUserAtom);
    const { schedules } = useSchedules({});
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name }), children: _jsx("div", { className: styles.grid, children: _jsxs(Card, { className: styles.calendarCard, children: [_jsx(CardHeader, { title: "\uC804\uCCB4 \uC77C\uC815" }), _jsx(CardBody, { children: _jsx(CalendarView, { schedules: schedules }) })] }) }) }));
}
export function DashboardPage() {
    const user = useAtomValue(authUserAtom);
    if (user.role === 'seventy')
        return _jsx(SeventyDashboard, {});
    if (user.role === 'admin')
        return _jsx(AdminDashboardContent, {});
    return _jsx(PresidentDashboard, {});
}
