import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
dayjs.locale('ko');
import clsx from 'clsx';
import styles from './MultiDatePicker.module.scss';
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export function MultiDatePicker({ selected, onChange, minDate, maxDate }) {
    const [current, setCurrent] = useState(dayjs());
    const min = dayjs(minDate ?? dayjs().format('YYYY-MM-DD'));
    const max = dayjs(maxDate ?? dayjs().add(90, 'day').format('YYYY-MM-DD'));
    const start = current.startOf('month').startOf('week');
    const end = current.endOf('month').endOf('week');
    const days = [];
    let d = start;
    while (d.isBefore(end) || d.isSame(end, 'day')) {
        days.push(d);
        d = d.add(1, 'day');
    }
    const toggle = (dateStr) => {
        onChange(selected.includes(dateStr)
            ? selected.filter(s => s !== dateStr)
            : [...selected, dateStr].sort());
    };
    return (_jsxs("div", { className: styles.picker, children: [_jsxs("div", { className: styles.controls, children: [_jsx("button", { type: "button", className: styles.navBtn, onClick: () => setCurrent(c => c.subtract(1, 'month')), children: _jsx(ChevronLeft, { size: 16 }) }), _jsx("span", { className: styles.period, children: current.format('YYYY년 M월') }), _jsx("button", { type: "button", className: styles.navBtn, onClick: () => setCurrent(c => c.add(1, 'month')), children: _jsx(ChevronRight, { size: 16 }) })] }), _jsxs("div", { className: styles.grid, children: [DOW.map(day => (_jsx("div", { className: styles.dowLabel, children: day }, day))), days.map(day => {
                        const dateStr = day.format('YYYY-MM-DD');
                        const isCurrentMonth = day.month() === current.month();
                        const isPast = day.isBefore(min, 'day');
                        const isTooFar = day.isAfter(max, 'day');
                        const isDisabled = !isCurrentMonth || isPast || isTooFar;
                        const isSelected = selected.includes(dateStr);
                        const isToday = day.isSame(dayjs(), 'day');
                        return (_jsx("button", { type: "button", disabled: isDisabled, onClick: () => !isDisabled && toggle(dateStr), className: clsx(styles.cell, !isCurrentMonth && styles.otherMonth, isToday && styles.today, isSelected && styles.selected, !isDisabled && !isSelected && styles.available), children: day.date() }, dateStr));
                    })] }), selected.length > 0 && (_jsxs("div", { className: styles.selectedList, children: [_jsxs("p", { className: styles.selectedTitle, children: ["\uC120\uD0DD\uB41C \uB0A0\uC9DC (", selected.length, "\uC77C)"] }), _jsx("div", { className: styles.chips, children: selected.map(date => (_jsxs("button", { type: "button", className: styles.chip, onClick: () => toggle(date), children: [dayjs(date).format('M/D (ddd)'), " \u2715"] }, date))) })] }))] }));
}
