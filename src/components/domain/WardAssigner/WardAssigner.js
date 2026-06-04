import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
dayjs.locale('ko');
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import styles from './WardAssigner.module.scss';
const DOW_KR = ['일', '월', '화', '수', '목', '금', '토'];
export function WardAssigner({ availableDates, wards, note, initialAssignments, onSubmit, submitting }) {
    const [assignments, setAssignments] = useState(() => {
        // Pre-fill from previously submitted assignments if editing a responded task
        const base = Object.fromEntries(wards.map(w => [w.id, null]));
        if (initialAssignments) {
            for (const { wardName, date } of initialAssignments) {
                const ward = wards.find(w => w.name === wardName);
                if (ward)
                    base[ward.id] = date;
            }
        }
        return base;
    });
    const [warnings, setWarnings] = useState([]);
    const [pendingAssignments, setPendingAssignments] = useState(null);
    const assignedCount = Object.values(assignments).filter(Boolean).length;
    function assign(wardId, date) {
        setAssignments(prev => ({
            ...prev,
            [wardId]: prev[wardId] === date ? null : date,
        }));
        // Clear any pending warning state when user changes assignments
        setWarnings([]);
        setPendingAssignments(null);
    }
    function buildResult() {
        return wards
            .filter(w => assignments[w.id])
            .map(w => ({ wardName: w.name, date: assignments[w.id] }));
    }
    function detectWarnings(result) {
        const found = [];
        // 1. Same-date conflicts
        const dateToWards = {};
        for (const { wardName, date } of result) {
            if (!dateToWards[date])
                dateToWards[date] = [];
            dateToWards[date].push(wardName);
        }
        for (const [date, names] of Object.entries(dateToWards)) {
            if (names.length > 1) {
                found.push({
                    type: 'conflict',
                    label: `${dayjs(date).format('M/D (ddd)')} — 날짜 중복`,
                    detail: names.join(', '),
                });
            }
        }
        // 2. Unassigned wards
        const unassigned = wards.filter(w => !assignments[w.id]).map(w => w.name);
        if (unassigned.length > 0) {
            found.push({
                type: 'missing',
                label: `${unassigned.length}개 와드/지부 미배정`,
                detail: unassigned.join(', '),
            });
        }
        return found;
    }
    async function handleSubmit() {
        const result = buildResult();
        const found = detectWarnings(result);
        if (found.length > 0 && !pendingAssignments) {
            setWarnings(found);
            setPendingAssignments(result);
            return;
        }
        await onSubmit(pendingAssignments ?? result);
        setWarnings([]);
        setPendingAssignments(null);
    }
    function handleCancelWarning() {
        setWarnings([]);
        setPendingAssignments(null);
    }
    if (availableDates.length === 0) {
        return _jsx("p", { className: styles.empty, children: "\uBC30\uC815 \uAC00\uB2A5\uD55C \uC77C\uC694\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    return (_jsxs("div", { className: styles.assigner, children: [note && (_jsxs("div", { className: styles.note, children: [_jsx("span", { className: styles.noteLabel, children: "\uAD00\uB9AC\uC790 \uBA54\uBAA8" }), _jsx("p", { className: styles.noteText, children: note })] })), _jsx("div", { className: styles.legend, children: _jsx("span", { className: styles.legendNote, children: "\uAC01 \uC640\uB4DC/\uC9C0\uBD80\uC5D0 \uBC29\uBB38\uD560 \uC77C\uC694\uC77C\uC744 \uC120\uD0DD\uD558\uC138\uC694. \uB2E4\uC2DC \uD074\uB9AD\uD558\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4." }) }), _jsxs("div", { className: styles.dateRow, children: [_jsx("div", { className: styles.wardCol }), availableDates.map(d => {
                        const dj = dayjs(d);
                        return (_jsxs("div", { className: styles.dateHeader, children: [_jsx("span", { className: styles.dateHeaderMonth, children: dj.format('M월') }), _jsx("span", { className: styles.dateHeaderDay, children: dj.date() }), _jsx("span", { className: styles.dateHeaderDow, children: DOW_KR[dj.day()] })] }, d));
                    })] }), _jsx("div", { className: styles.wardList, children: wards.length === 0 ? (_jsx("p", { className: styles.emptyWards, children: "\uC18C\uC18D \uC640\uB4DC/\uC9C0\uBD80 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (wards.map(ward => {
                    const assigned = assignments[ward.id];
                    return (_jsxs("div", { className: clsx(styles.wardRow, assigned && styles.wardRowAssigned), children: [_jsxs("div", { className: styles.wardName, children: [_jsx("span", { className: styles.wardNameText, children: ward.name }), assigned && (_jsx("span", { className: styles.wardAssignedBadge, children: dayjs(assigned).format('M/D') }))] }), _jsx("div", { className: styles.dateCells, children: availableDates.map(d => {
                                    const isSelected = assigned === d;
                                    const otherWardOnDate = wards.find(w => w.id !== ward.id && assignments[w.id] === d);
                                    return (_jsx("button", { type: "button", className: clsx(styles.dateCell, isSelected && styles.dateCellSelected, otherWardOnDate && !isSelected && styles.dateCellShared), onClick: () => assign(ward.id, d), title: otherWardOnDate
                                            ? `${otherWardOnDate.name}도 이 날짜에 배정됨`
                                            : dayjs(d).format('M월 D일'), children: isSelected ? '✓' : otherWardOnDate ? '!' : '' }, d));
                                }) })] }, ward.id));
                })) }), warnings.length > 0 && (_jsxs("div", { className: styles.conflictBox, children: [_jsxs("div", { className: styles.conflictHeader, children: [_jsx(AlertTriangle, { size: 16, className: styles.conflictIcon }), _jsx("span", { className: styles.conflictTitle, children: "\uC81C\uCD9C \uC804 \uD655\uC778\uD558\uC138\uC694" })] }), _jsx("ul", { className: styles.conflictList, children: warnings.map((w, i) => (_jsxs("li", { className: styles.conflictItem, children: [_jsx("span", { className: clsx(styles.conflictDate, w.type === 'missing' && styles.conflictDateMissing), children: w.label }), _jsx("span", { className: styles.conflictWards, children: w.detail })] }, i))) }), _jsx("p", { className: styles.conflictQuestion, children: "\uADF8\uB798\uB3C4 \uC774 \uBC30\uC815\uC73C\uB85C \uC81C\uCD9C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?" }), _jsxs("div", { className: styles.conflictActions, children: [_jsx(Button, { variant: "ghost", onClick: handleCancelWarning, children: "\uCDE8\uC18C (\uB2E4\uC2DC \uC218\uC815)" }), _jsx(Button, { onClick: handleSubmit, loading: submitting, children: "\uD655\uC778 \uD6C4 \uC81C\uCD9C" })] })] })), warnings.length === 0 && (_jsxs("div", { className: styles.footer, children: [_jsx("span", { className: styles.footerCount, children: assignedCount > 0
                            ? `${assignedCount}개 와드/지부 배정됨`
                            : '배정된 와드/지부가 없습니다' }), _jsx(Button, { onClick: handleSubmit, loading: submitting, disabled: assignedCount === 0, children: "\uBC30\uC815 \uC81C\uCD9C" })] }))] }));
}
