import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
dayjs.locale('ko');
import clsx from 'clsx';
import { isFastSunday } from '@/utils/fastSunday';
import styles from './VisitDatePicker.module.scss';
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export function VisitDatePicker({ slots, selected, onSelect }) {
    const [current, setCurrent] = useState(dayjs());
    const slotByDate = new Map(slots.map(s => [s.date, s]));
    const start = current.startOf('month').startOf('week');
    const end = current.endOf('month').endOf('week');
    const days = [];
    let day = start;
    while (day.isBefore(end) || day.isSame(end, 'day')) {
        days.push(day);
        day = day.add(1, 'day');
    }
    const availableCount = slots.filter(s => s.isAvailable).length;
    return (_jsxs("div", { className: styles.picker, children: [_jsxs("div", { className: styles.controls, children: [_jsx("button", { type: "button", className: styles.navBtn, onClick: () => setCurrent(c => c.subtract(1, 'month')), children: _jsx(ChevronLeft, { size: 16 }) }), _jsx("span", { className: styles.period, children: current.format('YYYY년 M월') }), _jsx("button", { type: "button", className: styles.navBtn, onClick: () => setCurrent(c => c.add(1, 'month')), children: _jsx(ChevronRight, { size: 16 }) })] }), _jsxs("div", { className: styles.grid, children: [DOW.map(d => (_jsx("div", { className: clsx(styles.dowLabel, d === '일' && styles.dowSun), children: d }, d))), days.map(d => {
                        const dateStr = d.format('YYYY-MM-DD');
                        const isSunday = d.day() === 0;
                        const isCurrentMonth = d.month() === current.month();
                        const isToday = d.isSame(dayjs(), 'day');
                        const isFast = isFastSunday(d);
                        const slot = slotByDate.get(dateStr);
                        const isAvailable = isSunday && !isFast && !!slot?.isAvailable;
                        const isSelected = selected?.date === dateStr;
                        const isPast = d.isBefore(dayjs(), 'day');
                        return (_jsxs("button", { type: "button", disabled: !isAvailable, onClick: () => isAvailable && slot && onSelect(slot), className: clsx(styles.cell, !isCurrentMonth && styles.otherMonth, isSunday && isCurrentMonth && !isFast && !isPast && styles.sunday, isFast && isCurrentMonth && styles.fastSunday, isToday && styles.today, isSelected && styles.selected), children: [_jsx("span", { className: styles.day, children: d.date() }), isFast && isCurrentMonth && (_jsx("span", { className: styles.fastLabel, children: "\uAE08\uC2DD" }))] }, dateStr));
                    })] }), availableCount === 0 && (_jsx("p", { className: styles.empty, children: "\uC774 \uB2EC\uC5D0 \uAC00\uB2A5\uD55C \uBC29\uBB38 \uB0A0\uC9DC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })), _jsxs("div", { className: styles.legend, children: [_jsx("span", { className: clsx(styles.legendDot, styles.legendAvailable) }), _jsx("span", { className: styles.legendText, children: "\uBC29\uBB38 \uAC00\uB2A5" }), _jsx("span", { className: clsx(styles.legendDot, styles.legendFast) }), _jsx("span", { className: styles.legendText, children: "\uAE08\uC2DD\uC77C" })] })] }));
}
