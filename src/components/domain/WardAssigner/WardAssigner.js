import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
dayjs.locale('ko');
import clsx from 'clsx';
import { Button } from '@/components/ui';
import styles from './WardAssigner.module.scss';
const DOW_KR = ['일', '월', '화', '수', '목', '금', '토'];
export function WardAssigner({ availableDates, wards, onSubmit, submitting }) {
    // assignments: wardId → date (YYYY-MM-DD) | null
    const [assignments, setAssignments] = useState(Object.fromEntries(wards.map(w => [w.id, null])));
    const assignedCount = Object.values(assignments).filter(Boolean).length;
    function assign(wardId, date) {
        setAssignments(prev => ({
            ...prev,
            [wardId]: prev[wardId] === date ? null : date,
        }));
    }
    const handleSubmit = async () => {
        const result = wards
            .filter(w => assignments[w.id])
            .map(w => ({ wardName: w.name, date: assignments[w.id] }));
        await onSubmit(result);
    };
    if (availableDates.length === 0) {
        return _jsx("p", { className: styles.empty, children: "\uBC30\uC815 \uAC00\uB2A5\uD55C \uC77C\uC694\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    return (_jsxs("div", { className: styles.assigner, children: [_jsx("div", { className: styles.legend, children: _jsx("span", { className: styles.legendNote, children: "\uAC01 \uC640\uB4DC/\uC9C0\uBD80\uC5D0 \uBC29\uBB38\uD560 \uC77C\uC694\uC77C\uC744 \uC120\uD0DD\uD558\uC138\uC694. \uB2E4\uC2DC \uD074\uB9AD\uD558\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4." }) }), _jsxs("div", { className: styles.dateRow, children: [_jsx("div", { className: styles.wardCol }), availableDates.map(d => {
                        const dj = dayjs(d);
                        return (_jsxs("div", { className: styles.dateHeader, children: [_jsx("span", { className: styles.dateHeaderMonth, children: dj.format('M월') }), _jsx("span", { className: styles.dateHeaderDay, children: dj.date() }), _jsx("span", { className: styles.dateHeaderDow, children: DOW_KR[dj.day()] })] }, d));
                    })] }), _jsx("div", { className: styles.wardList, children: wards.map(ward => {
                    const assigned = assignments[ward.id];
                    return (_jsxs("div", { className: clsx(styles.wardRow, assigned && styles.wardRowAssigned), children: [_jsxs("div", { className: styles.wardName, children: [_jsx("span", { className: styles.wardNameText, children: ward.name }), assigned && (_jsx("span", { className: styles.wardAssignedBadge, children: dayjs(assigned).format('M/D') }))] }), _jsx("div", { className: styles.dateCells, children: availableDates.map(d => {
                                    const isSelected = assigned === d;
                                    const isDateTaken = Object.entries(assignments).some(([wid, aDate]) => wid !== ward.id && aDate === d);
                                    return (_jsx("button", { type: "button", className: clsx(styles.dateCell, isSelected && styles.dateCellSelected, isDateTaken && !isSelected && styles.dateCellTaken), onClick: () => assign(ward.id, d), title: isDateTaken ? '이 날짜에 다른 와드가 배정됨' : dayjs(d).format('M월 D일'), children: isSelected ? '✓' : isDateTaken ? '·' : '' }, d));
                                }) })] }, ward.id));
                }) }), _jsxs("div", { className: styles.footer, children: [_jsx("span", { className: styles.footerCount, children: assignedCount > 0
                            ? `${assignedCount}개 와드/지부 배정됨`
                            : '배정된 와드/지부가 없습니다' }), _jsx(Button, { onClick: handleSubmit, loading: submitting, disabled: assignedCount === 0, children: "\uBC30\uC815 \uC81C\uCD9C" })] })] }));
}
