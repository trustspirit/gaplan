import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { isFastSunday } from '@/utils/fastSunday';
import { ALL_UNITS, getUnitColor, getRegionColor, REGIONS } from '@/constants/regions';
import { Button } from '@/components/ui';
import styles from './CalendarView.module.scss';
// Day-of-week abbreviations derived from dayjs locale (auto-updates with language switch)
const getDOW = () => Array.from({ length: 7 }, (_, i) => dayjs().day(i).format('ddd'));
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
    const { t } = useTranslation();
    const [view, setView] = useState(defaultView);
    const [current, setCurrent] = useState(dayjs());
    const [weekOffset, setWeekOffset] = useState(0); // mobile 3-day sliding offset
    // Re-derive DOW whenever language changes
    const DOW = getDOW();
    // Reset mobile 3-day offset when week changes
    useEffect(() => { setWeekOffset(0); }, [current]);
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
    // ── Week view (time-axis block calendar) ──────────────────────────────────
    const renderWeekView = () => {
        const weekStart = current.startOf('week');
        const allDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
        const HOUR_START = 8;
        const HOUR_END = 22;
        const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
        const HOUR_HEIGHT = 56; // px per hour
        function timeToOffset(time) {
            const [h, m] = time.split(':').map(Number);
            return (h - HOUR_START + m / 60) * HOUR_HEIGHT;
        }
        function timeToDuration(start, end) {
            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            const mins = (eh * 60 + em) - (sh * 60 + sm);
            return (mins / 60) * HOUR_HEIGHT;
        }
        return (_jsxs("div", { className: styles.timeAxisWrap, children: [_jsxs("div", { className: styles.mobileDayNav, children: [_jsx("button", { type: "button", className: styles.mobileDayNavBtn, onClick: () => setWeekOffset(o => Math.max(0, o - 3)), disabled: weekOffset === 0, children: _jsx(ChevronLeft, { size: 16 }) }), _jsxs("span", { className: styles.mobileDayNavLabel, children: [allDays[weekOffset]?.format('M/D'), " \u2013 ", allDays[Math.min(weekOffset + 2, 6)]?.format('M/D')] }), _jsx("button", { type: "button", className: styles.mobileDayNavBtn, onClick: () => setWeekOffset(o => Math.min(4, o + 3)), disabled: weekOffset >= 4, children: _jsx(ChevronRight, { size: 16 }) })] }), _jsxs("div", { className: styles.timeAxis, children: [_jsxs("div", { className: styles.timeGutter, children: [_jsx("div", { className: styles.timeGutterHeader }), HOURS.map(h => (_jsxs("div", { className: styles.timeLabel, style: { height: HOUR_HEIGHT }, children: [String(h).padStart(2, '0'), ":00"] }, h)))] }), _jsx("div", { className: styles.dayColumns, children: allDays.map((d, idx) => {
                                const dateStr = d.format('YYYY-MM-DD');
                                const daySchedules = getSchedulesForDate(dateStr);
                                const isToday = d.isSame(dayjs(), 'day');
                                const isBlocked = isFastSunday(d);
                                const isSelected = selectedDate === dateStr;
                                const isMobileVisible = idx >= weekOffset && idx <= weekOffset + 2;
                                return (_jsxs("div", { className: clsx(styles.dayCol, isToday && styles.dayColToday, isBlocked && styles.dayColBlocked, isSelected && styles.dayColSelected, !isMobileVisible && styles.dayColHiddenMobile), onClick: () => !isBlocked && onDateClick?.(dateStr), children: [_jsxs("div", { className: clsx(styles.dayHeader, isToday && styles.dayHeaderToday), children: [_jsx("span", { className: styles.dayHeaderDow, children: DOW[d.day()] }), _jsx("span", { className: clsx(styles.dayHeaderNum, isToday && styles.dayHeaderNumToday), children: d.format('D') })] }), _jsxs("div", { className: styles.dayBody, style: { height: HOURS.length * HOUR_HEIGHT }, children: [HOURS.map(h => (_jsx("div", { className: styles.hourLine, style: { top: (h - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT } }, h))), daySchedules.map(s => {
                                                    const top = timeToOffset(s.startTime);
                                                    const height = Math.max(timeToDuration(s.startTime, s.endTime), 20);
                                                    const color = getUnitColor(s.unitId);
                                                    return (_jsxs("div", { className: styles.scheduleBlock, style: {
                                                            top,
                                                            height,
                                                            background: color.bg,
                                                            color: color.text,
                                                        }, onClick: e => e.stopPropagation(), children: [_jsx("span", { className: styles.scheduleBlockLabel, children: chipLabel(s, getUnitName) }), _jsxs("span", { className: styles.scheduleBlockTime, children: [s.startTime, "\u2013", s.endTime] })] }, s.id));
                                                })] })] }, dateStr));
                            }) })] })] }));
    };
    return (_jsxs("div", { className: styles.calendar, children: [_jsxs("div", { className: styles.controls, children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setCurrent(c => c.subtract(1, view === 'month' ? 'month' : 'week')), children: _jsx(ChevronLeft, { size: 16 }) }), _jsx("span", { className: styles.period, children: view === 'month'
                            ? current.format('YYYY년 M월')
                            : `${current.startOf('week').format('M/D')} – ${current.endOf('week').format('M/D')}` }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setCurrent(c => c.add(1, view === 'month' ? 'month' : 'week')), children: _jsx(ChevronRight, { size: 16 }) }), _jsxs("div", { className: styles.viewToggle, children: [_jsx(Button, { variant: view === 'month' ? 'primary' : 'ghost', size: "sm", onClick: () => setView('month'), children: t('common.monthView') }), _jsx(Button, { variant: view === 'week' ? 'primary' : 'ghost', size: "sm", onClick: () => setView('week'), children: t('common.weekView') })] })] }), view === 'month' ? renderMonthView() : renderWeekView(), _jsxs("div", { className: styles.legend, children: [(() => {
                        const visibleRegionIds = new Set(schedules
                            .map(s => ALL_UNITS.find(u => u.id === s.unitId)?.regionId)
                            .filter((id) => Boolean(id)));
                        const legendRegions = visibleRegionIds.size > 0
                            ? REGIONS.filter(r => visibleRegionIds.has(r.id))
                            : REGIONS;
                        return legendRegions.map(r => {
                            const c = getRegionColor(r.id);
                            return (_jsxs("span", { style: { color: c.text }, children: [_jsx("span", { className: styles.legendSwatch, style: { background: c.bg } }), " ", r.name] }, r.id));
                        });
                    })(), _jsxs("span", { className: styles.legendBlocked, children: [_jsx("span", { className: clsx(styles.legendSwatch, styles.swatchBlocked) }), " ", t('common.fastSundayLegend')] })] })] }));
}
