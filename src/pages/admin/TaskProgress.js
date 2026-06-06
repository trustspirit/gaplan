import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Pencil, XCircle } from 'lucide-react';
import { authUserAtom } from '@/store/authAtom';
import { useAllTasks } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { adminConfirmSchedule, adminConfirmWardVisit } from '@/services/scheduleService';
import { expireTask, updateTaskDetails } from '@/services/taskService';
import { ALL_UNITS, REGIONS } from '@/constants/regions';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Badge, Button, Skeleton, Input, Modal } from '@/components/ui';
import { MultiDatePicker, ResponseMatrix, ScheduleSuggestions } from '@/components/domain';
import styles from './TaskProgress.module.scss';
function StatusBadge({ status }) {
    const { t } = useTranslation();
    if (status === 'completed')
        return _jsx(Badge, { variant: "success", children: t('task.status.completed') });
    if (status === 'responded')
        return _jsx(Badge, { variant: "default", children: t('task.statusBadge.responded') });
    if (status === 'expired')
        return _jsx(Badge, { variant: "danger", children: t('task.status.expired') });
    return _jsx(Badge, { variant: "warning", children: t('task.status.pending') });
}
// ── Task Detail Modal (for completed tasks) ──────────────────────────────────
function TaskDetailModal({ task, presidentName, onClose, }) {
    return (_jsx("div", { className: styles.modalOverlay, onClick: onClose, children: _jsxs("div", { className: styles.modalSheet, onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: styles.modalHeader, children: [_jsx("h3", { className: styles.modalTitle, children: "\uD0DC\uC2A4\uD06C \uC0C1\uC138" }), _jsx("button", { type: "button", onClick: onClose, className: styles.closeBtn, children: "\u2715" })] }), _jsxs("div", { className: styles.modalBody, children: [_jsxs("div", { className: styles.detailRow, children: [_jsx("span", { className: styles.detailLabel, children: "\uC0C1\uD0DC" }), _jsx("span", { className: styles.detailValue, children: task.status })] }), _jsxs("div", { className: styles.detailRow, children: [_jsx("span", { className: styles.detailLabel, children: "\uB2F4\uB2F9\uC790" }), _jsx("span", { className: styles.detailValue, children: presidentName })] }), _jsxs("div", { className: styles.detailRow, children: [_jsx("span", { className: styles.detailLabel, children: "\uB9C8\uAC10\uC77C" }), _jsx("span", { className: styles.detailValue, children: task.dueDate })] }), task.note && (_jsxs("div", { className: styles.detailRow, children: [_jsx("span", { className: styles.detailLabel, children: "\uBA54\uBAA8" }), _jsx("span", { className: styles.detailValue, children: task.note })] })), task.respondedSlots && task.respondedSlots.length > 0 && (_jsxs("div", { className: styles.detailSection, children: [_jsx("div", { className: styles.detailSectionTitle, children: "\uC751\uB2F5\uD55C \uC2DC\uAC04" }), task.respondedSlots.map((slot, i) => (_jsxs("div", { className: styles.detailSlotRow, children: [slot.date, " ", slot.startTime, "\u2013", slot.endTime] }, i)))] })), task.wardAssignments && task.wardAssignments.length > 0 && (_jsxs("div", { className: styles.detailSection, children: [_jsx("div", { className: styles.detailSectionTitle, children: "\uC640\uB4DC \uBC30\uC815" }), task.wardAssignments.map((wa, i) => (_jsxs("div", { className: styles.detailSlotRow, children: [wa.wardName, ": ", wa.date] }, i)))] }))] })] }) }));
}
function EditTaskModal({ task, onClose }) {
    const { t } = useTranslation();
    const isVisit = task.type === 'select_visit';
    const [dueDate, setDueDate] = useState(task.dueDate);
    // For ward visits: just select available Sundays
    const [availableDates, setAvailableDates] = useState(task.availableDates ?? []);
    // For interview/sacrament: per-date time ranges
    const [selectedDates, setSelectedDates] = useState((task.availableDateSlots ?? []).map(s => s.date));
    const [dateRanges, setDateRanges] = useState(Object.fromEntries((task.availableDateSlots ?? []).map(s => [
        s.date,
        s.timeRanges?.length ? s.timeRanges : [{ startTime: '09:00', endTime: '18:00' }]
    ])));
    const [slotDuration, setSlotDuration] = useState(String(task.slotDurationMinutes ?? 60));
    const [saving, setSaving] = useState(false);
    function handleDatesChange(dates) {
        setSelectedDates(dates);
        setDateRanges(prev => {
            const next = {};
            dates.forEach(d => { next[d] = prev[d] ?? [{ startTime: '09:00', endTime: '18:00' }]; });
            return next;
        });
    }
    const availableDateSlots = selectedDates
        .map(d => ({ date: d, timeRanges: dateRanges[d] ?? [{ startTime: '09:00', endTime: '18:00' }] }))
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
            toast.success(t('task.editSuccess'));
            onClose();
        }
        catch {
            toast.error(t('task.editFailed'));
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Modal, { open: true, onClose: onClose, title: t('task.editTitle', { defaultValue: 'Task 수정' }), children: _jsxs("form", { className: styles.editForm, onSubmit: handleSave, children: [isVisit ? (_jsxs("div", { className: styles.editSection, children: [_jsx("p", { className: styles.editLabel, children: t('task.selectSundays', { defaultValue: '가능 방문 일요일 선택' }) }), _jsx(MultiDatePicker, { selected: availableDates, onChange: setAvailableDates, sundayOnly: true })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: styles.editSection, children: [_jsx("p", { className: styles.editLabel, children: t('task.selectDates', { defaultValue: '가능 날짜 (캘린더에서 선택)' }) }), _jsx(MultiDatePicker, { selected: selectedDates, onChange: handleDatesChange }), availableDateSlots.length > 0 && (_jsx("div", { className: styles.dateSlotList, children: availableDateSlots.map(s => (_jsxs("div", { className: styles.dateSlotItem, children: [_jsx("div", { className: styles.dateSlotDate, children: dayjs(s.date).format('M/D (ddd)') }), (dateRanges[s.date] ?? []).map((r, idx) => (_jsxs("div", { className: styles.timeRangeRow, children: [_jsx("input", { type: "time", value: r.startTime, className: styles.timeInput, onChange: e => setDateRanges(prev => ({
                                                            ...prev,
                                                            [s.date]: prev[s.date].map((x, i) => i === idx ? { ...x, startTime: e.target.value } : x)
                                                        })) }), _jsx("span", { children: "~" }), _jsx("input", { type: "time", value: r.endTime, className: styles.timeInput, onChange: e => setDateRanges(prev => ({
                                                            ...prev,
                                                            [s.date]: prev[s.date].map((x, i) => i === idx ? { ...x, endTime: e.target.value } : x)
                                                        })) })] }, idx)))] }, s.date))) }))] }), _jsx(Input, { label: t('slotDuration.label'), type: "number", min: "5", max: "480", step: "5", value: slotDuration, onChange: e => setSlotDuration(e.target.value) })] })), _jsx(Input, { label: t('task.dueDate'), type: "date", value: dueDate, onChange: e => setDueDate(e.target.value) }), task.status === 'responded' && (_jsxs("p", { className: styles.resetNote, children: [_jsx(AlertTriangle, { size: 13, style: { verticalAlign: 'middle', marginRight: 4 } }), t('task.resetWarning')] })), _jsxs("div", { className: styles.modalActions, children: [_jsx(Button, { variant: "ghost", type: "button", onClick: onClose, children: t('common.cancel') }), _jsx(Button, { type: "submit", loading: saving, children: t('task.editAndResend') })] })] }) }));
}
function formatRespondedAt(respondedAt) {
    if (!respondedAt)
        return '';
    // Firestore Timestamp shape
    if (typeof respondedAt === 'object' && respondedAt !== null && 'seconds' in respondedAt) {
        return dayjs(respondedAt.seconds * 1000).format('M/D HH:mm');
    }
    // String (e.g. ISO date stored by submitAvailability CF)
    if (typeof respondedAt === 'string')
        return dayjs(respondedAt).format('M/D HH:mm');
    return '';
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
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [expiring, setExpiring] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const daysLeft = dayjs(task.dueDate).diff(dayjs(), 'day');
    const isOverdue = daysLeft < 0;
    const typeLabel = task.title ?? t(`task.type.${task.type}`, { defaultValue: task.type });
    const hasSlots = (task.respondedSlots?.length ?? 0) > 0;
    const hasWardAssignments = (task.wardAssignments?.length ?? 0) > 0;
    const isVisitTask = task.type === 'select_visit';
    const canExpire = task.status === 'pending' || task.status === 'responded';
    const canEdit = task.status === 'pending' || task.status === 'responded';
    const isExpired = task.status === 'expired';
    const handleExpire = async () => {
        setExpiring(true);
        try {
            await expireTask(task.id);
            toast.success(t('task.expireSuccess'));
        }
        catch {
            toast.error(t('task.expireFailed'));
        }
        finally {
            setExpiring(false);
        }
    };
    const handleConfirmWardVisit = async () => {
        setConfirming(true);
        try {
            const result = await adminConfirmWardVisit(task.id);
            if (result.success) {
                toast.success(t('admin.wardConfirmSuccess', { count: result.scheduleCount }));
            }
            else {
                toast.error(result.error ?? t('common.confirmFailed'));
            }
        }
        catch (e) {
            toast.error(e?.message ?? t('common.unknownError'));
        }
        finally {
            setConfirming(false);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: clsx(styles.taskRow, task.status === 'responded' && styles.taskRowResponded, isExpired && styles.taskRowExpired, task.status === 'completed' && styles.clickable), onClick: () => { if (task.status === 'completed')
                    setDetailOpen(true); }, children: [_jsxs("div", { className: styles.taskRowMain, children: [_jsxs("div", { className: styles.taskRowLeft, children: [_jsx("div", { className: styles.taskIcon, children: task.status === 'completed'
                                            ? _jsx(CheckCircle2, { size: 16, className: styles.iconDone })
                                            : task.status === 'responded'
                                                ? _jsx(Clock, { size: 16, className: styles.iconResponded })
                                                : isExpired
                                                    ? _jsx(XCircle, { size: 16, className: styles.iconExpired })
                                                    : _jsx(AlertCircle, { size: 16, className: styles.iconPending }) }), _jsxs("div", { className: styles.taskInfo, children: [_jsx("span", { className: styles.taskPresident, children: presidentName }), _jsxs("span", { className: styles.taskMeta, children: [unitName, " \u00B7 ", typeLabel, " \u00B7 \uB9C8\uAC10 ", dayjs(task.dueDate).format('M/D'), task.status === 'pending' && (_jsx("span", { className: clsx(styles.dDay, isOverdue && styles.dDayOverdue), children: isOverdue ? ` (D+${Math.abs(daysLeft)})` : ` (D-${daysLeft})` })), task.status === 'responded' && task.respondedAt && (_jsxs("span", { className: styles.respondedAt, children: [' ', "\u00B7 ", formatRespondedAt(task.respondedAt), " ", t('task.submitted', { defaultValue: '제출' })] }))] })] })] }), _jsxs("div", { className: styles.taskRowRight, children: [_jsx(StatusBadge, { status: task.status }), task.status === 'responded' && hasSlots && !isVisitTask && (_jsxs("button", { type: "button", className: styles.expandBtn, onClick: () => setExpanded(v => !v), children: [expanded ? _jsx(ChevronUp, { size: 14 }) : _jsx(ChevronDown, { size: 14 }), expanded
                                                ? t('common.close')
                                                : t('task.slotsCount', { count: task.respondedSlots.length, defaultValue: `${task.respondedSlots.length}개 확인` })] })), task.status === 'responded' && isVisitTask && hasWardAssignments && (_jsxs("button", { type: "button", className: styles.expandBtn, onClick: () => setExpanded(v => !v), children: [expanded ? _jsx(ChevronUp, { size: 14 }) : _jsx(ChevronDown, { size: 14 }), expanded
                                                ? t('common.close')
                                                : t('task.wardCount', { count: task.wardAssignments.length, defaultValue: `${task.wardAssignments.length}개 배정 확인` })] })), canEdit && (_jsx("button", { type: "button", className: styles.actionBtn, onClick: () => setEditing(true), title: "\uC218\uC815", children: _jsx(Pencil, { size: 14 }) })), canExpire && (_jsx("button", { type: "button", className: clsx(styles.actionBtn, styles.actionBtnDanger), onClick: handleExpire, disabled: expiring, title: "\uB9CC\uB8CC", children: _jsx(XCircle, { size: 14 }) }))] })] }), expanded && task.respondedSlots && !isVisitTask && (_jsxs("div", { className: styles.slotsPanel, children: [_jsx("p", { className: styles.slotsPanelTitle, children: "\uD68C\uC7A5\uC774 \uC81C\uCD9C\uD55C \uAC00\uB2A5 \uC2DC\uAC04" }), task.respondedSlots.map(slot => (_jsx(RespondedSlotRow, { slot: slot, taskId: task.id, onConfirmed: () => setExpanded(false) }, `${slot.date}-${slot.startTime}`)))] })), expanded && isVisitTask && task.wardAssignments && (_jsxs("div", { className: styles.slotsPanel, children: [_jsx("p", { className: styles.slotsPanelTitle, children: "\uD68C\uC7A5\uC774 \uC81C\uCD9C\uD55C \uC640\uB4DC \uBC30\uC815" }), task.wardAssignments.map((a, i) => (_jsxs("div", { className: styles.slotRow, children: [_jsx("span", { className: styles.slotDate, children: dayjs(a.date).format('M/D (ddd)') }), _jsx("span", { className: styles.slotTime, children: a.wardName })] }, i))), task.status === 'responded' && (_jsx("div", { className: styles.wardConfirmRow, children: _jsxs(Button, { onClick: handleConfirmWardVisit, loading: confirming, size: "sm", children: ["\uC804\uCCB4 \uBC30\uC815 \uD655\uC815 (", task.wardAssignments.length, "\uAC1C \uC77C\uC815 \uC0DD\uC131)"] }) }))] }))] }), editing && _jsx(EditTaskModal, { task: task, onClose: () => setEditing(false) }), detailOpen && _jsx(TaskDetailModal, { task: task, presidentName: presidentName, onClose: () => setDetailOpen(false) })] }));
}
function RegionGroup({ regionId, tasks, getUserName, getUnitName }) {
    const { t } = useTranslation();
    const regionName = REGIONS.find(r => r.id === regionId)?.name ?? regionId;
    const responded = tasks.filter(t => t.status === 'responded');
    const pending = tasks.filter(t => t.status === 'pending');
    const completed = tasks.filter(t => t.status === 'completed');
    const expired = tasks.filter(t => t.status === 'expired');
    const renderRows = (list) => list.map(t => (_jsx(TaskRow, { task: t, presidentName: getUserName(t.assignedTo), unitName: getUnitName(t.assignedTo) }, t.id)));
    // Group interview/sacrament tasks by batchId for the ResponseMatrix
    const batchGroups = {};
    const timeTasks = tasks.filter(t => t.type === 'select_interview');
    for (const t of timeTasks) {
        const key = t.batchId ?? t.id;
        if (!batchGroups[key])
            batchGroups[key] = [];
        batchGroups[key].push(t);
    }
    const matrixBatches = Object.values(batchGroups).filter(batch => batch.some(t => t.status === 'responded' || t.status === 'completed'));
    return (_jsxs(Card, { children: [_jsx(CardHeader, { title: regionName, action: _jsxs("div", { className: styles.regionSummary, children: [responded.length > 0 && _jsxs(Badge, { variant: "default", children: ["\uC751\uB2F5 ", responded.length] }), pending.length > 0 && _jsxs(Badge, { variant: "warning", children: ["\uBBF8\uC751\uB2F5 ", pending.length] }), completed.length > 0 && _jsxs(Badge, { variant: "success", children: ["\uC644\uB8CC ", completed.length] })] }) }), _jsx(CardBody, { children: tasks.length === 0
                    ? _jsx("p", { className: styles.empty, children: "\uD574\uB2F9 \uC9C0\uC5ED Task \uC5C6\uC74C" })
                    : (_jsxs(_Fragment, { children: [matrixBatches.map(batch => {
                                const ref = batch[0];
                                const title = ref.title ?? t(`task.type.${ref.type}`, { defaultValue: ref.type });
                                const hasResponded = batch.some(t => t.status === 'responded' || t.status === 'completed');
                                return (_jsxs("div", { className: styles.statusSection, children: [_jsxs("p", { className: styles.statusLabel, children: [title, " \uC751\uB2F5 \uD604\uD669 (", batch.filter(t => t.status === 'responded' || t.status === 'completed').length, "/", batch.length, ")"] }), _jsx(ResponseMatrix, { tasks: batch, getPresidentName: getUserName }), hasResponded && (_jsx("div", { className: styles.suggestionsWrap, children: _jsx(ScheduleSuggestions, { tasks: batch, getPresidentName: getUserName }) }))] }, ref.batchId ?? ref.id));
                            }), responded.length > 0 && (_jsxs("div", { className: styles.statusSection, children: [_jsxs("p", { className: styles.statusLabel, children: ["\uD655\uC815 \uB300\uAE30 (", responded.length, ")"] }), renderRows(responded.filter(t => t.type === 'select_visit'))] })), pending.length > 0 && (_jsxs("div", { className: styles.statusSection, children: [_jsxs("p", { className: styles.statusLabel, children: ["\uBBF8\uC751\uB2F5 (", pending.length, ")"] }), renderRows(pending)] })), completed.length > 0 && (_jsxs("div", { className: styles.statusSection, children: [_jsxs("p", { className: styles.statusLabel, children: ["\uC644\uB8CC (", completed.length, ")"] }), renderRows(completed.filter(t => t.type === 'select_visit'))] })), expired.length > 0 && (_jsxs("div", { className: styles.statusSection, children: [_jsxs("p", { className: clsx(styles.statusLabel, styles.statusLabelExpired), children: ["\uB9CC\uB8CC (", expired.length, ")"] }), renderRows(expired)] }))] })) })] }));
}
// ── Main page ────────────────────────────────────────────────────────────────
export function TaskProgress() {
    const user = useAtomValue(authUserAtom);
    // Seventy: only their assigned tasks. Admin: all tasks.
    const { tasks, loading } = useAllTasks(user.role === 'seventy' ? user.uid : undefined);
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
