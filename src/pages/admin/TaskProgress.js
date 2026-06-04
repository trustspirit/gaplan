import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import clsx from 'clsx';
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, Pencil, XCircle } from 'lucide-react';
import { authUserAtom } from '@/store/authAtom';
import { useAllTasks } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { adminConfirmSchedule } from '@/services/scheduleService';
import { expireTask, updateTaskDetails } from '@/services/taskService';
import { ALL_UNITS, REGIONS } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Badge, Button, Skeleton, Input, Select, Modal } from '@/components/ui';
import { MultiDatePicker } from '@/components/domain';
import styles from './TaskProgress.module.scss';
const TASK_LABELS = {
    select_visit: '와드 방문',
    select_interview: '접견',
    select_meeting: '모임',
};
const SLOT_DURATION_OPTIONS = [
    { value: '30', label: '30분' },
    { value: '60', label: '1시간' },
    { value: '90', label: '1.5시간' },
    { value: '120', label: '2시간' },
];
function StatusBadge({ status }) {
    if (status === 'completed')
        return _jsx(Badge, { variant: "success", children: "\uC644\uB8CC" });
    if (status === 'responded')
        return _jsx(Badge, { variant: "default", children: "\uC751\uB2F5 \uC644\uB8CC" });
    if (status === 'expired')
        return _jsx(Badge, { variant: "danger", children: "\uB9CC\uB8CC" });
    return _jsx(Badge, { variant: "warning", children: "\uBBF8\uC751\uB2F5" });
}
function EditTaskModal({ task, onClose }) {
    const isVisit = task.type === 'select_visit';
    const [dueDate, setDueDate] = useState(task.dueDate);
    // For ward visits: just select available Sundays
    const [availableDates, setAvailableDates] = useState(task.availableDates ?? []);
    // For interview/meeting: per-date time slots
    const [selectedDates, setSelectedDates] = useState((task.availableDateSlots ?? []).map(s => s.date));
    const [dateTimes, setDateTimes] = useState(Object.fromEntries((task.availableDateSlots ?? []).map(s => [s.date, { startTime: s.startTime, endTime: s.endTime }])));
    const [slotDuration, setSlotDuration] = useState(String(task.slotDurationMinutes ?? 60));
    const [saving, setSaving] = useState(false);
    function handleDatesChange(dates) {
        setSelectedDates(dates);
        setDateTimes(prev => {
            const next = {};
            dates.forEach(d => { next[d] = prev[d] ?? { startTime: '09:00', endTime: '18:00' }; });
            return next;
        });
    }
    const availableDateSlots = selectedDates
        .map(d => ({ date: d, ...(dateTimes[d] ?? { startTime: '09:00', endTime: '18:00' }) }))
        .sort((a, b) => a.date.localeCompare(b.date));
    const handleSave = async (e) => {
        e.preventDefault();
        if (isVisit && availableDates.length === 0) {
            toast.error('가능 일요일을 하나 이상 선택해주세요.');
            return;
        }
        if (!isVisit && availableDateSlots.length === 0) {
            toast.error('가능 날짜를 하나 이상 선택해주세요.');
            return;
        }
        setSaving(true);
        try {
            await updateTaskDetails(task.id, {
                dueDate,
                ...(isVisit ? { availableDates } : { availableDateSlots, slotDurationMinutes: parseInt(slotDuration) }),
            }, task.status === 'responded');
            toast.success('Task가 수정되었습니다.');
            onClose();
        }
        catch {
            toast.error('수정에 실패했습니다.');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Modal, { open: true, onClose: onClose, title: "Task \uC218\uC815", children: _jsxs("form", { className: styles.editForm, onSubmit: handleSave, children: [isVisit ? (_jsxs("div", { className: styles.editSection, children: [_jsx("p", { className: styles.editLabel, children: "\uAC00\uB2A5 \uBC29\uBB38 \uC77C\uC694\uC77C \uC120\uD0DD" }), _jsx(MultiDatePicker, { selected: availableDates, onChange: setAvailableDates, sundayOnly: true })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: styles.editSection, children: [_jsx("p", { className: styles.editLabel, children: "\uAC00\uB2A5 \uB0A0\uC9DC (\uCE98\uB9B0\uB354\uC5D0\uC11C \uC120\uD0DD)" }), _jsx(MultiDatePicker, { selected: selectedDates, onChange: handleDatesChange }), availableDateSlots.length > 0 && (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }, children: availableDateSlots.map(s => (_jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8125rem' }, children: [_jsx("span", { style: { minWidth: 70, fontWeight: 500 }, children: dayjs(s.date).format('M/D (ddd)') }), _jsx("input", { type: "time", value: s.startTime, style: { border: '1px solid #e4e4e6', borderRadius: 6, padding: '2px 6px' }, onChange: e => setDateTimes(prev => ({ ...prev, [s.date]: { ...prev[s.date], startTime: e.target.value } })) }), _jsx("span", { children: "~" }), _jsx("input", { type: "time", value: s.endTime, style: { border: '1px solid #e4e4e6', borderRadius: 6, padding: '2px 6px' }, onChange: e => setDateTimes(prev => ({ ...prev, [s.date]: { ...prev[s.date], endTime: e.target.value } })) })] }, s.date))) }))] }), _jsx("div", { className: styles.timeRow }), _jsx(Select, { label: "\uC2DC\uAC04 \uB2E8\uC704", value: slotDuration, onChange: e => setSlotDuration(e.target.value), options: SLOT_DURATION_OPTIONS })] })), _jsx(Input, { label: "\uB9C8\uAC10\uC77C", type: "date", value: dueDate, onChange: e => setDueDate(e.target.value) }), task.status === 'responded' && (_jsx("p", { className: styles.resetNote, children: "\u26A0 \uC774\uBBF8 \uC751\uB2F5\uD55C \uB0B4\uC6A9\uC774 \uCD08\uAE30\uD654\uB418\uACE0 \uD68C\uC7A5\uC774 \uB2E4\uC2DC \uC751\uB2F5\uD574\uC57C \uD569\uB2C8\uB2E4." })), _jsxs("div", { className: styles.modalActions, children: [_jsx(Button, { variant: "ghost", type: "button", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "submit", loading: saving, children: "\uC800\uC7A5 \uBC0F \uC7AC\uC804\uB2EC" })] })] }) }));
}
// ── Responded slot row ───────────────────────────────────────────────────────
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
            else
                toast.error(result.error ?? '확정에 실패했습니다.');
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
    const [editing, setEditing] = useState(false);
    const [expiring, setExpiring] = useState(false);
    const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day');
    const isOverdue = daysLeft < 0;
    const typeLabel = TASK_LABELS[task.type] ?? task.type;
    const hasSlots = (task.respondedSlots?.length ?? 0) > 0;
    const canExpire = task.status === 'pending' || task.status === 'responded';
    const canEdit = task.status === 'pending' || task.status === 'responded';
    const isExpired = task.status === 'expired';
    const handleExpire = async () => {
        setExpiring(true);
        try {
            await expireTask(task.id);
            toast.success('Task가 만료되었습니다.');
        }
        catch {
            toast.error('만료 처리에 실패했습니다.');
        }
        finally {
            setExpiring(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: clsx(styles.taskRow, task.status === 'responded' && styles.taskRowResponded, isExpired && styles.taskRowExpired), children: [_jsxs("div", { className: styles.taskRowMain, children: [_jsxs("div", { className: styles.taskRowLeft, children: [_jsx("div", { className: styles.taskIcon, children: task.status === 'completed'
                                            ? _jsx(CheckCircle2, { size: 16, className: styles.iconDone })
                                            : task.status === 'responded'
                                                ? _jsx(Clock, { size: 16, className: styles.iconResponded })
                                                : isExpired
                                                    ? _jsx(XCircle, { size: 16, className: styles.iconExpired })
                                                    : _jsx(AlertCircle, { size: 16, className: styles.iconPending }) }), _jsxs("div", { className: styles.taskInfo, children: [_jsx("span", { className: styles.taskPresident, children: presidentName }), _jsxs("span", { className: styles.taskMeta, children: [unitName, " \u00B7 ", typeLabel, " \u00B7 \uB9C8\uAC10 ", dayjs(task.dueDate).format('M/D'), task.status === 'pending' && (_jsx("span", { className: clsx(styles.dDay, isOverdue && styles.dDayOverdue), children: isOverdue ? ` (D+${Math.abs(daysLeft)})` : ` (D-${daysLeft})` })), task.status === 'responded' && task.respondedAt && (_jsxs("span", { className: styles.respondedAt, children: [' ', "\u00B7 ", dayjs(task.respondedAt.seconds * 1000).format('M/D HH:mm'), " \uC81C\uCD9C"] }))] })] })] }), _jsxs("div", { className: styles.taskRowRight, children: [_jsx(StatusBadge, { status: task.status }), task.status === 'responded' && hasSlots && (_jsxs("button", { type: "button", className: styles.expandBtn, onClick: () => setExpanded(v => !v), children: [expanded ? _jsx(ChevronUp, { size: 14 }) : _jsx(ChevronDown, { size: 14 }), expanded ? '닫기' : `${task.respondedSlots.length}개 확인`] })), canEdit && (_jsx("button", { type: "button", className: styles.actionBtn, onClick: () => setEditing(true), title: "\uC218\uC815", children: _jsx(Pencil, { size: 14 }) })), canExpire && (_jsx("button", { type: "button", className: clsx(styles.actionBtn, styles.actionBtnDanger), onClick: handleExpire, disabled: expiring, title: "\uB9CC\uB8CC", children: _jsx(XCircle, { size: 14 }) }))] })] }), expanded && task.respondedSlots && (_jsxs("div", { className: styles.slotsPanel, children: [_jsx("p", { className: styles.slotsPanelTitle, children: "\uD68C\uC7A5\uC774 \uC81C\uCD9C\uD55C \uAC00\uB2A5 \uC2DC\uAC04" }), task.respondedSlots.map(slot => (_jsx(RespondedSlotRow, { slot: slot, taskId: task.id, onConfirmed: () => setExpanded(false) }, `${slot.date}-${slot.startTime}`)))] }))] }), editing && _jsx(EditTaskModal, { task: task, onClose: () => setEditing(false) })] }));
}
function RegionGroup({ regionId, tasks, getUserName, getUnitName }) {
    const regionName = REGIONS.find(r => r.id === regionId)?.name ?? regionId;
    const responded = tasks.filter(t => t.status === 'responded');
    const pending = tasks.filter(t => t.status === 'pending');
    const completed = tasks.filter(t => t.status === 'completed');
    const expired = tasks.filter(t => t.status === 'expired');
    const renderRows = (list) => list.map(t => (_jsx(TaskRow, { task: t, presidentName: getUserName(t.assignedTo), unitName: getUnitName(t.assignedTo) }, t.id)));
    return (_jsxs(Card, { children: [_jsx(CardHeader, { title: regionName, action: _jsxs("div", { className: styles.regionSummary, children: [responded.length > 0 && _jsxs(Badge, { variant: "default", children: ["\uC751\uB2F5 ", responded.length] }), pending.length > 0 && _jsxs(Badge, { variant: "warning", children: ["\uBBF8\uC751\uB2F5 ", pending.length] }), completed.length > 0 && _jsxs(Badge, { variant: "success", children: ["\uC644\uB8CC ", completed.length] })] }) }), _jsx(CardBody, { children: tasks.length === 0
                    ? _jsx("p", { className: styles.empty, children: "\uD574\uB2F9 \uC9C0\uC5ED Task \uC5C6\uC74C" })
                    : (_jsxs(_Fragment, { children: [responded.length > 0 && (_jsxs("div", { className: styles.statusSection, children: [_jsxs("p", { className: styles.statusLabel, children: ["\uD655\uC815 \uB300\uAE30 (", responded.length, ")"] }), renderRows(responded)] })), pending.length > 0 && (_jsxs("div", { className: styles.statusSection, children: [_jsxs("p", { className: styles.statusLabel, children: ["\uBBF8\uC751\uB2F5 (", pending.length, ")"] }), renderRows(pending)] })), completed.length > 0 && (_jsxs("div", { className: styles.statusSection, children: [_jsxs("p", { className: styles.statusLabel, children: ["\uC644\uB8CC (", completed.length, ")"] }), renderRows(completed)] })), expired.length > 0 && (_jsxs("div", { className: styles.statusSection, children: [_jsxs("p", { className: clsx(styles.statusLabel, styles.statusLabelExpired), children: ["\uB9CC\uB8CC (", expired.length, ")"] }), renderRows(expired)] }))] })) })] }));
}
// ── Main page ────────────────────────────────────────────────────────────────
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
    // Group tasks by regionId
    const tasksByRegion = tasks.reduce((acc, t) => {
        const key = t.regionId || 'unknown';
        if (!acc[key])
            acc[key] = [];
        acc[key].push(t);
        return acc;
    }, {});
    const totalResponded = tasks.filter(t => t.status === 'responded').length;
    const totalPending = tasks.filter(t => t.status === 'pending').length;
    const totalCompleted = tasks.filter(t => t.status === 'completed').length;
    const totalExpired = tasks.filter(t => t.status === 'expired').length;
    // Order regions by REGIONS constant order, put unknown at end
    const regionIds = [
        ...REGIONS.map(r => r.id).filter(id => tasksByRegion[id]),
        ...Object.keys(tasksByRegion).filter(id => !REGIONS.find(r => r.id === id)),
    ];
    return (_jsx(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, subtext: "Task \uC9C4\uD589 \uD604\uD669" }), children: _jsxs("div", { className: styles.page, children: [_jsxs("div", { className: styles.summary, children: [_jsxs("div", { className: styles.summaryItem, children: [_jsx("span", { className: clsx(styles.summaryNum, styles.summaryNumResponded), children: totalResponded }), _jsx("span", { className: styles.summaryLabel, children: "\uD655\uC815 \uB300\uAE30" })] }), _jsxs("div", { className: styles.summaryItem, children: [_jsx("span", { className: styles.summaryNum, children: totalPending }), _jsx("span", { className: styles.summaryLabel, children: "\uBBF8\uC751\uB2F5" })] }), _jsxs("div", { className: styles.summaryItem, children: [_jsx("span", { className: clsx(styles.summaryNum, styles.summaryNumDone), children: totalCompleted }), _jsx("span", { className: styles.summaryLabel, children: "\uC644\uB8CC" })] }), _jsxs("div", { className: styles.summaryItem, children: [_jsx("span", { className: clsx(styles.summaryNum, styles.summaryNumExpired), children: totalExpired }), _jsx("span", { className: styles.summaryLabel, children: "\uB9CC\uB8CC" })] })] }), loading ? (_jsx(Card, { children: _jsx(CardBody, { children: [1, 2, 3].map(i => _jsx(Skeleton, { height: "56px", className: styles.skeletonRow }, i)) }) })) : tasks.length === 0 ? (_jsx(Card, { children: _jsx(CardBody, { children: _jsx("p", { className: styles.empty, children: "\uC0DD\uC131\uB41C Task\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }) }) })) : (regionIds.map(regionId => (_jsx(RegionGroup, { regionId: regionId, tasks: tasksByRegion[regionId], getUserName: getUserName, getUnitName: getUnitName }, regionId))))] }) }));
}
