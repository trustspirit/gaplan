import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MapPin, Users, CalendarPlus } from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import styles from './ScheduleItem.module.scss';
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
function buildGCalUrl(schedule, unitName) {
    const title = schedule.type === 'ward_visit'
        ? `와드 방문 - ${unitName}`
        : schedule.type === 'interview'
            ? `접견 - ${unitName}`
            : `모임 - ${unitName}`;
    const start = `${schedule.date.replace(/-/g, '')}T${schedule.startTime.replace(':', '')}00`;
    const end = `${schedule.date.replace(/-/g, '')}T${schedule.endTime.replace(':', '')}00`;
    const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${start}/${end}` });
    return `https://calendar.google.com/calendar/render?${params}`;
}
export function ScheduleItem({ schedule, unitName, past, showCalendarAdd = false }) {
    const isVisit = schedule.type === 'ward_visit';
    const date = dayjs(schedule.date);
    const dow = DOW_LABELS[date.day()];
    const isPast = past ?? date.isBefore(dayjs(), 'day');
    return (_jsxs("div", { className: clsx(styles.item, isVisit ? styles.visit : styles.interview, isPast && styles.past), children: [_jsxs("div", { className: styles.dateBox, children: [_jsx("span", { className: styles.day, children: date.format('D') }), _jsx("span", { className: styles.month, children: date.format('M월') }), _jsx("span", { className: styles.dow, children: dow })] }), _jsxs("div", { className: styles.info, children: [_jsxs("div", { className: styles.typeBadge, children: [isVisit ? _jsx(MapPin, { size: 11 }) : _jsx(Users, { size: 11 }), _jsx("span", { children: isVisit ? '와드 방문' : '접견' })] }), _jsx("p", { className: styles.unit, children: unitName }), _jsxs("p", { className: styles.time, children: [schedule.startTime, " \u2013 ", schedule.endTime] })] }), isPast && _jsx("span", { className: styles.pastBadge, children: "\uC644\uB8CC" }), showCalendarAdd && !isPast && (_jsx("a", { href: buildGCalUrl(schedule, unitName), target: "_blank", rel: "noopener noreferrer", className: styles.calendarAddBtn, title: "\uB0B4 \uCE98\uB9B0\uB354\uC5D0 \uCD94\uAC00", children: _jsx(CalendarPlus, { size: 15 }) }))] }));
}
