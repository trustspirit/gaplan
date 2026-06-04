import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
dayjs.locale('ko');
import clsx from 'clsx';
import { isFastSunday } from '@/utils/fastSunday';
import { ALL_UNITS, getUnitColor } from '@/constants/regions';
import { Button } from '@/components/ui';
import styles from './CalendarView.module.scss';
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_CHIPS = 2; // max chips shown per cell before "+N"
function chipLabel(s, getUnitName) {
    if (s.wardName)
        return s.wardName;
    return getUnitName ? getUnitName(s.unitId) : s.unitId;
}
function regionLabel(unitId) {
    const unit = ALL_UNITS.find(u => u.id === unitId);
    return unit?.name ?? unitId;
}
function ScheduleChip({ schedule, getUnitName }) {
    const label = chipLabel(schedule, getUnitName);
    const color = getUnitColor(schedule.unitId);
    return (_jsx("span", { className: styles.chip, style: { background: color.bg, color: color.text }, title: regionLabel(schedule.unitId), children: label }));
}
export function CalendarView({ schedules, onDateClick, selectedDate, getUnitName, defaultView = 'month', }) {
    const [view, setView] = useState(defaultView);
    const [current, setCurrent] = useState(dayjs());
    const getSchedulesForDate = (date) => schedules.filter(s => s.date === date && s.status === 'confirmed');
    // ── Month view ─────────────────────────────────────────────────────────────
    const renderMonthView = () => {
        const start = current.startOf('month').startOf('week');
        const end = current.endOf('month').endOf('week');
        const days = [];
        let day = start;
        while (day.isBefore(end) || day.isSame(end, 'day')) {
            days.push(day);
            day = day.add(1, 'day');
        }
        return (_jsxs("div", { className: styles.monthGrid, children: [DOW.map(d => (_jsx("div", { className: styles.dow, children: d }, d))), days.map(d => {
                    const dateStr = d.format('YYYY-MM-DD');
                    const daySchedules = getSchedulesForDate(dateStr);
                    const isToday = d.isSame(dayjs(), 'day');
                    const isCurrentMonth = d.month() === current.month();
                    const isBlocked = isFastSunday(d);
                    const isSelected = selectedDate === dateStr;
                    const visible = daySchedules.slice(0, MAX_CHIPS);
                    const extra = daySchedules.length - MAX_CHIPS;
                    return (_jsxs("div", { className: clsx(styles.cell, !isCurrentMonth && styles.otherMonth, isToday && styles.today, isBlocked && styles.blocked, isSelected && styles.selected), onClick: () => onDateClick?.(dateStr), children: [_jsx("span", { className: styles.cellDay, children: d.date() }), daySchedules.length > 0 && (_jsxs("div", { className: styles.chips, children: [visible.map(s => (_jsx(ScheduleChip, { schedule: s, getUnitName: getUnitName }, s.id))), extra > 0 && (_jsxs("span", { className: styles.chipMore, children: ["+", extra] }))] }))] }, dateStr));
                })] }));
    };
    // ── Week view ──────────────────────────────────────────────────────────────
    const renderWeekView = () => {
        const weekStart = current.startOf('week');
        const days = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
        return (_jsx("div", { className: styles.weekGrid, children: days.map(d => {
                const dateStr = d.format('YYYY-MM-DD');
                const daySchedules = getSchedulesForDate(dateStr);
                const isToday = d.isSame(dayjs(), 'day');
                const isBlocked = isFastSunday(d);
                const isSelected = selectedDate === dateStr;
                return (_jsxs("div", { className: clsx(styles.weekRow, isSelected && styles.weekRowSelected), onClick: () => !isBlocked && onDateClick?.(dateStr), children: [_jsxs("span", { className: clsx(styles.weekDayLabel, isToday && styles.weekDayLabelToday, isBlocked && styles.weekDayBlocked), children: [DOW[d.day()], " ", d.format('M/D'), isBlocked ? ' (금식)' : ''] }), _jsx("div", { className: styles.weekSchedules, children: daySchedules.length === 0 ? (_jsx("span", { className: styles.weekEmpty, children: "\u2014" })) : (daySchedules.map(s => (_jsx(ScheduleChip, { schedule: s, getUnitName: getUnitName }, s.id)))) })] }, dateStr));
            }) }));
    };
    return (_jsxs("div", { className: styles.calendar, children: [_jsxs("div", { className: styles.controls, children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setCurrent(c => c.subtract(1, view === 'month' ? 'month' : 'week')), children: _jsx(ChevronLeft, { size: 16 }) }), _jsx("span", { className: styles.period, children: view === 'month'
                            ? current.format('YYYY년 M월')
                            : `${current.startOf('week').format('M/D')} – ${current.endOf('week').format('M/D')}` }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setCurrent(c => c.add(1, view === 'month' ? 'month' : 'week')), children: _jsx(ChevronRight, { size: 16 }) }), _jsxs("div", { className: styles.viewToggle, children: [_jsx(Button, { variant: view === 'month' ? 'primary' : 'ghost', size: "sm", onClick: () => setView('month'), children: "\uC6D4" }), _jsx(Button, { variant: view === 'week' ? 'primary' : 'ghost', size: "sm", onClick: () => setView('week'), children: "\uC8FC" })] })] }), view === 'month' ? renderMonthView() : renderWeekView(), _jsxs("div", { className: styles.legend, children: [_jsxs("span", { style: { color: '#1e40af' }, children: [_jsx("span", { className: styles.legendSwatch, style: { background: '#dbeafe' } }), " \uC11C\uC6B8"] }), _jsxs("span", { style: { color: '#9d174d' }, children: [_jsx("span", { className: styles.legendSwatch, style: { background: '#fce8f3' } }), " \uC11C\uC6B8\uB0A8"] }), _jsxs("span", { style: { color: '#065f46' }, children: [_jsx("span", { className: styles.legendSwatch, style: { background: '#ecfdf5' } }), " \uBD80\uC0B0"] }), _jsxs("span", { className: styles.legendBlocked, children: [_jsx("span", { className: clsx(styles.legendSwatch, styles.swatchBlocked) }), " \uAE08\uC2DD\uC77C"] })] })] }));
}
