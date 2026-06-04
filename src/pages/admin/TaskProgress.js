import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import clsx from 'clsx';
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { authUserAtom } from '@/store/authAtom';
import { useAllTasks } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { adminConfirmSchedule } from '@/services/scheduleService';
import { ALL_UNITS } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Badge, Button, Skeleton } from '@/components/ui';
import styles from './TaskProgress.module.scss';
const TASK_LABELS = {
    select_visit: '와드 방문',
    select_interview: '접견',
    select_meeting: '모임',
};
function StatusBadge({ status }) {
    if (status === 'completed')
        return _jsx(Badge, { variant: "success", children: "\uC644\uB8CC" });
    if (status === 'responded')
        return _jsx(Badge, { variant: "default", children: "\uC751\uB2F5 \uC644\uB8CC" });
    return _jsx(Badge, { variant: "warning", children: "\uBBF8\uC751\uB2F5" });
}
function RespondedSlotRow({ slot, taskId, onConfirmed }) {
    const [loading, setLoading] = useState(false);
    const handleConfirm = async () => {
        setLoading(true);
        try {
            const result = await adminConfirmSchedule({ taskId, slot });
            if (result.success) {
                toast.success('일정이 확정되었습니다!');
                onConfirmed();
            }
            else {
                toast.error(result.error ?? '확정에 실패했습니다.');
            }
        }
        catch {
            toast.error('오류가 발생했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: styles.slotRow, children: [_jsx("span", { className: styles.slotDate, children: dayjs(slot.date).format('M/D (ddd)') }), _jsxs("span", { className: styles.slotTime, children: [slot.startTime, " ~ ", slot.endTime] }), _jsx(Button, { size: "sm", onClick: handleConfirm, loading: loading, children: "\uC774 \uC2DC\uAC04\uC73C\uB85C \uD655\uC815" })] }));
}
function TaskRow({ task, presidentName, unitName }) {
    const [expanded, setExpanded] = useState(false);
    const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day');
    const isOverdue = daysLeft < 0;
    const typeLabel = TASK_LABELS[task.type] ?? task.type;
    const hasSlots = (task.respondedSlots?.length ?? 0) > 0;
    return (_jsxs("div", { className: clsx(styles.taskRow, task.status === 'responded' && styles.taskRowResponded), children: [_jsxs("div", { className: styles.taskRowMain, children: [_jsxs("div", { className: styles.taskRowLeft, children: [_jsx("div", { className: styles.taskIcon, children: task.status === 'completed'
                                    ? _jsx(CheckCircle2, { size: 16, className: styles.iconDone })
                                    : task.status === 'responded'
                                        ? _jsx(Clock, { size: 16, className: styles.iconResponded })
                                        : _jsx(AlertCircle, { size: 16, className: styles.iconPending }) }), _jsxs("div", { className: styles.taskInfo, children: [_jsx("span", { className: styles.taskPresident, children: presidentName }), _jsxs("span", { className: styles.taskMeta, children: [unitName, " \u00B7 ", typeLabel, " \u00B7 \uB9C8\uAC10 ", dayjs(task.dueDate).format('M/D'), task.status === 'pending' && (_jsx("span", { className: clsx(styles.dDay, isOverdue && styles.dDayOverdue), children: isOverdue ? ` (D+${Math.abs(daysLeft)})` : ` (D-${daysLeft})` })), task.status === 'responded' && task.respondedAt && (_jsxs("span", { className: styles.respondedAt, children: ["\u00B7 ", dayjs(task.respondedAt.seconds * 1000).format('M/D HH:mm'), " \uC81C\uCD9C"] }))] })] })] }), _jsxs("div", { className: styles.taskRowRight, children: [_jsx(StatusBadge, { status: task.status }), task.status === 'responded' && hasSlots && (_jsxs("button", { type: "button", className: styles.expandBtn, onClick: () => setExpanded(prev => !prev), children: [expanded ? _jsx(ChevronUp, { size: 16 }) : _jsx(ChevronDown, { size: 16 }), expanded ? '닫기' : `${task.respondedSlots.length}개 시간 확인`] }))] })] }), expanded && task.respondedSlots && (_jsxs("div", { className: styles.slotsPanel, children: [_jsx("p", { className: styles.slotsPanelTitle, children: "\uD68C\uC7A5\uC774 \uC81C\uCD9C\uD55C \uAC00\uB2A5 \uC2DC\uAC04" }), task.respondedSlots.map(slot => (_jsx(RespondedSlotRow, { slot: slot, taskId: task.id, onConfirmed: () => setExpanded(false) }, `${slot.date}-${slot.startTime}`)))] }))] }));
}
export function TaskProgress() {
    const user = useAtomValue(authUserAtom);
    const { tasks, loading } = useAllTasks();
    const { users } = useUsers();
    const getUserName = (uid) => users.find(u => u.uid === uid)?.name ?? uid;
    const getUnitName = (uid) => {
        const president = users.find(u => u.uid === uid);
        const unit = ALL_UNITS.find(u => u.id === president?.unitId);
        return unit?.name ?? '-';
    };
    const pending = tasks.filter(t => t.status === 'pending');
    const responded = tasks.filter(t => t.status === 'responded');
    const completed = tasks.filter(t => t.status === 'completed');
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "Task \uC9C4\uD589 \uD604\uD669" }), children: _jsxs("div", { className: styles.page, children: [_jsxs("div", { className: styles.summary, children: [_jsxs("div", { className: styles.summaryItem, children: [_jsx("span", { className: styles.summaryNum, children: pending.length }), _jsx("span", { className: styles.summaryLabel, children: "\uBBF8\uC751\uB2F5" })] }), _jsxs("div", { className: styles.summaryItem, children: [_jsx("span", { className: clsx(styles.summaryNum, styles.summaryNumResponded), children: responded.length }), _jsx("span", { className: styles.summaryLabel, children: "\uD655\uC815 \uB300\uAE30" })] }), _jsxs("div", { className: styles.summaryItem, children: [_jsx("span", { className: clsx(styles.summaryNum, styles.summaryNumDone), children: completed.length }), _jsx("span", { className: styles.summaryLabel, children: "\uC644\uB8CC" })] })] }), loading ? (_jsx(Card, { children: _jsx(CardBody, { children: [1, 2, 3].map(i => _jsx(Skeleton, { height: "56px", className: styles.skeletonRow }, i)) }) })) : (_jsxs(_Fragment, { children: [responded.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: `확정 대기 (${responded.length})` }), _jsx(CardBody, { children: responded.map(t => (_jsx(TaskRow, { task: t, presidentName: getUserName(t.assignedTo), unitName: getUnitName(t.assignedTo) }, t.id))) })] })), pending.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: `미응답 (${pending.length})` }), _jsx(CardBody, { children: pending.map(t => (_jsx(TaskRow, { task: t, presidentName: getUserName(t.assignedTo), unitName: getUnitName(t.assignedTo) }, t.id))) })] })), completed.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: `완료 (${completed.length})` }), _jsx(CardBody, { children: completed.map(t => (_jsx(TaskRow, { task: t, presidentName: getUserName(t.assignedTo), unitName: getUnitName(t.assignedTo) }, t.id))) })] })), tasks.length === 0 && (_jsx(Card, { children: _jsx(CardBody, { children: _jsx("p", { className: styles.empty, children: "\uC0DD\uC131\uB41C Task\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }) }) }))] }))] }) }));
}
