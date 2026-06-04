import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MapPin, Users } from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import styles from './ScheduleItem.module.scss';
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
export function ScheduleItem({ schedule, unitName, past }) {
    const isVisit = schedule.type === 'ward_visit';
    const date = dayjs(schedule.date);
    const dow = DOW_LABELS[date.day()];
    const isPast = past ?? date.isBefore(dayjs(), 'day');
    return (_jsxs("div", { className: clsx(styles.item, isVisit ? styles.visit : styles.interview, isPast && styles.past), children: [_jsxs("div", { className: styles.dateBox, children: [_jsx("span", { className: styles.day, children: date.format('D') }), _jsx("span", { className: styles.month, children: date.format('M월') }), _jsx("span", { className: styles.dow, children: dow })] }), _jsxs("div", { className: styles.info, children: [_jsxs("div", { className: styles.typeBadge, children: [isVisit ? _jsx(MapPin, { size: 11 }) : _jsx(Users, { size: 11 }), _jsx("span", { children: isVisit ? '와드 방문' : '접견' })] }), _jsx("p", { className: styles.unit, children: unitName }), _jsxs("p", { className: styles.time, children: [schedule.startTime, " \u2013 ", schedule.endTime] })] }), isPast && _jsx("span", { className: styles.pastBadge, children: "\uC644\uB8CC" })] }));
}
