import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ResponseMatrix — shows who selected which time slot across all responded tasks in a batch.
 *
 * Rows = time slots (generated from the task's availableDateSlots)
 * Cols = presidents who received the task
 * Cell = ✓ if that president selected this slot
 * Admin clicks a cell → adminConfirmSchedule for that president's task + slot
 */
import { useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
dayjs.locale('ko');
import clsx from 'clsx';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { adminConfirmSchedule } from '@/services/scheduleService';
import { computeInterviewSlots } from '@/services/availabilityService';
import styles from './ResponseMatrix.module.scss';
function slotKey(date, startTime) {
    return `${date}_${startTime}`;
}
function heatClass(ratio) {
    if (ratio === 0)
        return styles.heat0;
    if (ratio <= 0.33)
        return styles.heat1;
    if (ratio <= 0.66)
        return styles.heat2;
    return styles.heat3;
}
// Assign a consistent color per respondent index
const PALETTE = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];
function respondentColor(idx) {
    return PALETTE[idx % PALETTE.length];
}
export function ResponseMatrix({ tasks, getPresidentName, onConfirmed }) {
    const { t } = useTranslation();
    const [confirming, setConfirming] = useState(null);
    const [view, setView] = useState('heatmap');
    const [hiddenIds, setHiddenIds] = useState(new Set());
    // Use the first task's availableDateSlots to build the time axis
    const refTask = tasks[0];
    const slots = refTask
        ? computeInterviewSlots(refTask.availableDateSlots ?? [], refTask.slotDurationMinutes ?? 60)
        : [];
    const respondents = tasks
        .filter(t => t.status === 'responded')
        .map(t => ({ name: getPresidentName(t.assignedTo), task: t }));
    if (slots.length === 0 || respondents.length === 0) {
        return (_jsx("div", { className: styles.empty, children: t('admin.noResponse') }));
    }
    // Index: slotKey → set of respondent taskIds that selected it
    const slotResponders = new Map();
    for (const r of respondents) {
        for (const s of (r.task.respondedSlots ?? [])) {
            const key = slotKey(s.date, s.startTime);
            if (!slotResponders.has(key))
                slotResponders.set(key, new Set());
            slotResponders.get(key).add(r.task.id);
        }
    }
    const visibleRespondents = respondents.filter(r => !hiddenIds.has(r.task.id));
    const totalVisible = visibleRespondents.length;
    async function handleConfirm(task, slot) {
        const key = `${task.id}_${slot.date}_${slot.startTime}`;
        setConfirming(key);
        try {
            const result = await adminConfirmSchedule({ taskId: task.id, slot });
            if (result.success) {
                toast.success(`${getPresidentName(task.assignedTo)} — ${dayjs(slot.date).format('M/D')} ${slot.startTime} 확정!`);
                onConfirmed?.();
            }
            else {
                toast.error(result.error ?? '확정에 실패했습니다.');
            }
        }
        catch {
            toast.error('오류가 발생했습니다.');
        }
        finally {
            setConfirming(null);
        }
    }
    function toggleHidden(id) {
        setHiddenIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }
    // Group slots by date for header display
    const dates = [...new Set(slots.map(s => s.date))];
    return (_jsxs("div", { className: styles.matrix, children: [_jsx("div", { className: styles.legend, children: respondents.map((r, idx) => {
                    const color = respondentColor(idx);
                    const hidden = hiddenIds.has(r.task.id);
                    const completed = r.task.status === 'completed';
                    return (_jsxs("label", { className: clsx(styles.legendItem, hidden && styles.legendItemHidden), children: [_jsx("input", { type: "checkbox", checked: !hidden, onChange: () => toggleHidden(r.task.id), style: { accentColor: color } }), _jsx("span", { className: styles.legendDot, style: { background: color } }), _jsxs("span", { className: clsx(styles.legendName, hidden && styles.legendNameHidden), children: [r.name, completed && _jsx(CheckCircle2, { size: 12, className: styles.completedIcon })] })] }, r.task.id));
                }) }), _jsxs("div", { className: styles.viewToggle, children: [_jsxs("button", { type: "button", className: clsx(styles.viewBtn, view === 'heatmap' && styles.viewBtnActive), onClick: () => setView('heatmap'), children: ["\uD83D\uDFE9 ", t('admin.availabilityHeatmap')] }), _jsxs("button", { type: "button", className: clsx(styles.viewBtn, view === 'participant' && styles.viewBtnActive), onClick: () => setView('participant'), children: ["\uD83D\uDC64 ", t('admin.availabilityByParticipant')] })] }), _jsx("div", { className: styles.tableWrap, children: view === 'heatmap' ? (_jsxs("table", { className: styles.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: clsx(styles.th, styles.thTime), children: "\uC2DC\uAC04" }), dates.map(date => (_jsxs("th", { className: clsx(styles.th, styles.thDate), children: [_jsx("span", { className: styles.dateMonth, children: dayjs(date).format('M월') }), _jsx("span", { className: styles.dateDay, children: dayjs(date).date() }), _jsx("span", { className: styles.dateDow, children: dayjs(date).format('ddd') })] }, date)))] }) }), _jsx("tbody", { children: [...new Set(slots.map(s => s.startTime))].map(time => (_jsxs("tr", { children: [_jsx("td", { className: clsx(styles.td, styles.tdTime), children: time }), dates.map(date => {
                                        const slot = slots.find(s => s.date === date && s.startTime === time);
                                        if (!slot)
                                            return _jsx("td", { className: clsx(styles.td, styles.tdEmpty) }, date);
                                        const key = slotKey(date, time);
                                        const allResponders = slotResponders.get(key) ?? new Set();
                                        const visibleCount = [...allResponders].filter(id => {
                                            const r = respondents.find(r => r.task.id === id);
                                            return r && !hiddenIds.has(r.task.id);
                                        }).length;
                                        const ratio = totalVisible > 0 ? visibleCount / totalVisible : 0;
                                        const slotRespondentList = respondents.filter(r => allResponders.has(r.task.id) && !hiddenIds.has(r.task.id));
                                        return (_jsxs("td", { className: clsx(styles.td, styles.tdSlot, heatClass(ratio)), children: [_jsxs("span", { className: styles.slotCount, children: [visibleCount, "/", totalVisible] }), _jsx("div", { className: styles.slotNames, children: slotRespondentList.map((r, idx) => {
                                                        const isConfirming = confirming === `${r.task.id}_${date}_${time}`;
                                                        const isCompleted = r.task.status === 'completed';
                                                        return (_jsxs("button", { type: "button", className: clsx(styles.slotName, isCompleted && styles.slotNameConfirmed, isConfirming && styles.slotNameConfirming), style: { borderLeftColor: respondentColor(respondents.indexOf(r)), color: respondentColor(respondents.indexOf(r)) }, onClick: () => !isCompleted && handleConfirm(r.task, { date, startTime: time, endTime: slot.endTime }), title: isCompleted ? '이미 확정됨' : `${r.name} — 이 시간으로 확정`, disabled: !!confirming || isCompleted, children: [isCompleted ? '✓ ' : '', r.name] }, r.task.id));
                                                    }) })] }, date));
                                    })] }, time))) })] })) : (_jsxs("table", { className: styles.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: clsx(styles.th, styles.thTime), children: "\uB0A0\uC9DC / \uC2DC\uAC04" }), visibleRespondents.map((r, idx) => (_jsx("th", { className: clsx(styles.th, styles.thParticipant), style: { color: respondentColor(respondents.indexOf(r)) }, children: r.name }, r.task.id)))] }) }), _jsx("tbody", { children: dates.map(date => (_jsxs(Fragment, { children: [_jsx("tr", { className: styles.dateHeader, children: _jsx("td", { className: clsx(styles.td, styles.tdDateHeader), colSpan: visibleRespondents.length + 1, children: dayjs(date).format('M월 D일 (ddd)') }) }), slots.filter(s => s.date === date).map(slot => (_jsxs("tr", { children: [_jsx("td", { className: clsx(styles.td, styles.tdTime), children: slot.startTime }), visibleRespondents.map(r => {
                                                const selected = (r.task.respondedSlots ?? [])
                                                    .some(s => s.date === date && s.startTime === slot.startTime);
                                                const color = respondentColor(respondents.indexOf(r));
                                                const isCompleted = r.task.status === 'completed';
                                                const isConfirming = confirming === `${r.task.id}_${date}_${slot.startTime}`;
                                                return (_jsx("td", { className: clsx(styles.td, styles.tdCheck), children: selected ? (_jsx("button", { type: "button", className: clsx(styles.checkBtn, isCompleted && styles.checkBtnConfirmed), style: { background: color + '33', color }, onClick: () => !isCompleted && handleConfirm(r.task, slot), title: isCompleted ? '이미 확정됨' : '이 시간으로 확정', disabled: !!confirming || isCompleted, children: isCompleted ? '✓' : isConfirming ? '...' : '✓' })) : (_jsx("span", { className: styles.checkEmpty })) }, r.task.id));
                                            })] }, `${date}_${slot.startTime}`)))] }, date))) })] })) })] }));
}
