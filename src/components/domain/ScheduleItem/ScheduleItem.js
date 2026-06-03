import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MapPin, Users } from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import styles from './ScheduleItem.module.scss';
export function ScheduleItem({ schedule, unitName }) {
    const isVisit = schedule.type === 'ward_visit';
    return (_jsxs("div", { className: clsx(styles.item, isVisit ? styles.visit : styles.interview), children: [_jsxs("div", { className: styles.dateBox, children: [_jsx("span", { className: styles.day, children: dayjs(schedule.date).format('D') }), _jsx("span", { className: styles.month, children: dayjs(schedule.date).format('M월') })] }), _jsxs("div", { className: styles.info, children: [_jsxs("div", { className: styles.type, children: [isVisit ? _jsx(MapPin, { size: 12 }) : _jsx(Users, { size: 12 }), _jsx("span", { children: isVisit ? '와드 방문' : '접견' })] }), _jsx("p", { className: styles.unit, children: unitName }), _jsxs("p", { className: styles.time, children: [schedule.startTime, " \u2013 ", schedule.endTime] })] })] }));
}
