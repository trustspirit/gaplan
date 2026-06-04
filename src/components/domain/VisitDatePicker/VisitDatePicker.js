import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { isFastSunday } from '@/utils/fastSunday';
import styles from './VisitDatePicker.module.scss';
export function VisitDatePicker({ slots, selected, onSelect }) {
    const { t } = useTranslation();
    const DOW = Array.from({ length: 7 }, (_, i) => dayjs().day(i).format('ddd'));
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
                        return (_jsxs("button", { type: "button", disabled: !isAvailable, onClick: () => isAvailable && slot && onSelect(slot), className: clsx(styles.cell, !isCurrentMonth && styles.otherMonth, isSunday && isCurrentMonth && !isFast && !isPast && styles.sunday, isFast && isCurrentMonth && styles.fastSunday, isToday && styles.today, isSelected && styles.selected), children: [_jsx("span", { className: styles.day, children: d.date() }), isFast && isCurrentMonth && (_jsx("span", { className: styles.fastLabel, children: t('common.fastSunday') }))] }, dateStr));
                    })] }), availableCount === 0 && (_jsx("p", { className: styles.empty, children: t('schedule.noDates') })), _jsxs("div", { className: styles.legend, children: [_jsx("span", { className: clsx(styles.legendDot, styles.legendAvailable) }), _jsx("span", { className: styles.legendText, children: t('calendar.legendAvailable') }), _jsx("span", { className: clsx(styles.legendDot, styles.legendFast) }), _jsx("span", { className: styles.legendText, children: t('common.fastSundayLegend') })] })] }));
}
