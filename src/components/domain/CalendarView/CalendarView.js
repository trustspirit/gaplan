import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { Button } from '@/components/ui';
import styles from './CalendarView.module.scss';
export function CalendarView({ schedules, onDateClick, defaultView = 'month' }) {
    const [view, setView] = useState(defaultView);
    const [current, setCurrent] = useState(dayjs());
    const getSchedulesForDate = (date) => schedules.filter(s => s.date === date && s.status === 'confirmed');
    const isFastSunday = (d) => {
        const firstDay = d.startOf('month');
        const daysToSunday = (7 - firstDay.day()) % 7;
        const firstSundayDate = firstDay.date() + daysToSunday;
        return d.date() === firstSundayDate && d.day() === 0;
    };
    const renderMonthView = () => {
        const start = current.startOf('month').startOf('week');
        const end = current.endOf('month').endOf('week');
        const days = [];
        let day = start;
        while (day.isBefore(end) || day.isSame(end, 'day')) {
            days.push(day);
            day = day.add(1, 'day');
        }
        return (_jsxs("div", { className: styles.monthGrid, children: [['일', '월', '화', '수', '목', '금', '토'].map(d => (_jsx("div", { className: styles.dow, children: d }, d))), days.map(d => {
                    const dateStr = d.format('YYYY-MM-DD');
                    const daySchedules = getSchedulesForDate(dateStr);
                    const isToday = d.isSame(dayjs(), 'day');
                    const isCurrentMonth = d.month() === current.month();
                    const isBlocked = isFastSunday(d);
                    return (_jsxs("div", { className: clsx(styles.cell, !isCurrentMonth && styles.otherMonth, isToday && styles.today, isBlocked && styles.blocked), onClick: () => onDateClick?.(dateStr), children: [_jsx("span", { className: styles.cellDay, children: d.date() }), _jsx("div", { className: styles.dots, children: daySchedules.map(s => (_jsx("span", { className: clsx(styles.dot, s.type === 'ward_visit' ? styles.dotVisit : styles.dotInterview) }, s.id))) })] }, dateStr));
                })] }));
    };
    return (_jsxs("div", { className: styles.calendar, children: [_jsxs("div", { className: styles.controls, children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setCurrent(c => c.subtract(1, view === 'month' ? 'month' : 'week')), children: _jsx(ChevronLeft, { size: 16 }) }), _jsx("span", { className: styles.period, children: view === 'month' ? current.format('YYYY년 M월') : `${current.startOf('week').format('M/D')} – ${current.endOf('week').format('M/D')}` }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setCurrent(c => c.add(1, view === 'month' ? 'month' : 'week')), children: _jsx(ChevronRight, { size: 16 }) }), _jsxs("div", { className: styles.viewToggle, children: [_jsx(Button, { variant: view === 'month' ? 'primary' : 'ghost', size: "sm", onClick: () => setView('month'), children: "\uC6D4" }), _jsx(Button, { variant: view === 'week' ? 'primary' : 'ghost', size: "sm", onClick: () => setView('week'), children: "\uC8FC" })] })] }), view === 'month' ? renderMonthView() : (_jsx("p", { className: styles.wip, children: "\uC8FC\uAC04 \uBDF0 \u2014 \uCD94\uD6C4 \uAD6C\uD604" })), _jsxs("div", { className: styles.legend, children: [_jsxs("span", { children: [_jsx("span", { className: clsx(styles.dot, styles.dotVisit) }), " \uC640\uB4DC \uBC29\uBB38"] }), _jsxs("span", { children: [_jsx("span", { className: clsx(styles.dot, styles.dotInterview) }), " \uC811\uACAC"] }), _jsxs("span", { children: [_jsx("span", { className: clsx(styles.dot, styles.dotBlocked) }), " \uAE08\uC2DD\uC77C"] })] })] }));
}
