import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import styles from './WardAssigner.module.scss';
const DOW_KR = ['일', '월', '화', '수', '목', '금', '토'];
export function WardAssigner({ availableDates, wards, note, initialAssignments, onSubmit, submitting }) {
    const { t } = useTranslation();
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
        return _jsx("p", { className: styles.empty, children: t('ward.noSundaysAvailable') });
    }
    return (_jsxs("div", { className: styles.assigner, children: [note && (_jsxs("div", { className: styles.note, children: [_jsx("span", { className: styles.noteLabel, children: t('task.noteLabel', { defaultValue: '관리자 메모' }) }), _jsx("p", { className: styles.noteText, children: note })] })), _jsx("div", { className: styles.legend, children: _jsx("span", { className: styles.legendNote, children: t('ward.assignHint') }) }), _jsxs("div", { className: styles.dateRow, children: [_jsx("div", { className: styles.wardCol }), availableDates.map(d => {
                        const dj = dayjs(d);
                        return (_jsxs("div", { className: styles.dateHeader, children: [_jsx("span", { className: styles.dateHeaderMonth, children: dj.format('M월') }), _jsx("span", { className: styles.dateHeaderDay, children: dj.date() }), _jsx("span", { className: styles.dateHeaderDow, children: DOW_KR[dj.day()] })] }, d));
                    })] }), _jsx("div", { className: styles.wardList, children: wards.length === 0 ? (_jsx("p", { className: styles.emptyWards, children: t('ward.noWards', { defaultValue: '소속 와드/지부 정보가 없습니다.' }) })) : (wards.map(ward => {
                    const assigned = assignments[ward.id];
                    return (_jsxs("div", { className: clsx(styles.wardRow, assigned && styles.wardRowAssigned), children: [_jsxs("div", { className: styles.wardName, children: [_jsx("span", { className: styles.wardNameText, children: ward.name }), assigned && (_jsx("span", { className: styles.wardAssignedBadge, children: dayjs(assigned).format('M/D') }))] }), _jsx("div", { className: styles.dateCells, children: availableDates.map(d => {
                                    const isSelected = assigned === d;
                                    const otherWardOnDate = wards.find(w => w.id !== ward.id && assignments[w.id] === d);
                                    return (_jsx("button", { type: "button", className: clsx(styles.dateCell, isSelected && styles.dateCellSelected, otherWardOnDate && !isSelected && styles.dateCellShared), onClick: () => assign(ward.id, d), title: otherWardOnDate
                                            ? `${otherWardOnDate.name} — ${t('ward.takenDateHint')}`
                                            : dayjs(d).format('M월 D일'), children: isSelected ? '✓' : otherWardOnDate ? '!' : '' }, d));
                                }) })] }, ward.id));
                })) }), warnings.length > 0 && (_jsxs("div", { className: styles.conflictBox, children: [_jsxs("div", { className: styles.conflictHeader, children: [_jsx(AlertTriangle, { size: 16, className: styles.conflictIcon }), _jsx("span", { className: styles.conflictTitle, children: t('ward.warningTitle', { defaultValue: '제출 전 확인하세요' }) })] }), _jsx("ul", { className: styles.conflictList, children: warnings.map((w, i) => (_jsxs("li", { className: styles.conflictItem, children: [_jsx("span", { className: clsx(styles.conflictDate, w.type === 'missing' && styles.conflictDateMissing), children: w.label }), _jsx("span", { className: styles.conflictWards, children: w.detail })] }, i))) }), _jsx("p", { className: styles.conflictQuestion, children: t('ward.confirmAnyway', { defaultValue: '그래도 이 배정으로 제출하시겠습니까?' }) }), _jsxs("div", { className: styles.conflictActions, children: [_jsxs(Button, { variant: "secondary", onClick: handleCancelWarning, children: ["\u2190 ", t('common.cancel'), " (", t('ward.backToEdit', { defaultValue: '다시 수정' }), ")"] }), _jsx(Button, { onClick: handleSubmit, loading: submitting, children: t('ward.confirmAndSubmit', { defaultValue: '확인 후 제출' }) })] })] })), warnings.length === 0 && (_jsxs("div", { className: styles.footer, children: [_jsx("span", { className: styles.footerCount, children: assignedCount > 0
                            ? t('ward.assignedCount', { count: assignedCount })
                            : t('ward.noneAssigned') }), _jsx(Button, { onClick: handleSubmit, loading: submitting, disabled: assignedCount === 0, children: t('ward.submitAssignment') })] }))] }));
}
