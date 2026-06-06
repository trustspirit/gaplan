import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { MapPin, Users, CalendarPlus, Coffee } from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import styles from './ScheduleItem.module.scss';
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
function buildGCalUrl(schedule, unitName) {
    const locationLabel = schedule.wardName ? `${unitName} ${schedule.wardName}` : unitName;
    const title = schedule.type === 'ward_visit'
        ? `와드 방문 - ${locationLabel}`
        : schedule.type === 'interview'
            ? `접견 - ${unitName}`
            : `모임 - ${unitName}`;
    const start = `${schedule.date.replace(/-/g, '')}T${schedule.startTime.replace(':', '')}00`;
    const end = `${schedule.date.replace(/-/g, '')}T${schedule.endTime.replace(':', '')}00`;
    const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${start}/${end}` });
    return `https://calendar.google.com/calendar/render?${params}`;
}
export function ScheduleItem({ schedule, unitName, past, showCalendarAdd = false, canEdit, onEdit, onDelete, }) {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const isVisit = schedule.type === 'ward_visit';
    const isMeeting = schedule.type === 'meeting';
    const date = dayjs(schedule.date);
    const dow = DOW_LABELS[date.day()];
    const isPast = past ?? date.isBefore(dayjs(), 'day');
    return (_jsxs("div", { className: styles.wrapper, children: [_jsx("div", { className: clsx(styles.colorBar, isVisit ? styles.visitBar : isMeeting ? styles.meetingBar : styles.interviewBar) }), _jsxs("div", { className: clsx(styles.item, isVisit ? styles.visit : isMeeting ? styles.meeting : styles.interview, isPast && styles.past), children: [_jsxs("div", { className: styles.dateBox, children: [_jsx("span", { className: styles.month, children: date.format('M월') }), _jsx("span", { className: styles.day, children: date.format('D') }), _jsx("span", { className: styles.dow, children: dow })] }), _jsxs("div", { className: styles.info, children: [_jsxs("div", { className: styles.typeBadge, children: [isVisit ? _jsx(MapPin, { size: 11 }) : isMeeting ? _jsx(Coffee, { size: 11 }) : _jsx(Users, { size: 11 }), _jsx("span", { children: t(`schedule.type.${schedule.type}`) })] }), _jsxs("p", { className: styles.unit, children: [unitName, schedule.wardName && _jsxs("span", { className: styles.wardName, children: [" \u00B7 ", schedule.wardName] })] }), _jsxs("p", { className: styles.time, children: [schedule.startTime, " \u2013 ", schedule.endTime] })] }), isPast && _jsx("span", { className: styles.pastBadge, children: t('common.complete') }), showCalendarAdd && !isPast && (_jsx("a", { href: buildGCalUrl(schedule, unitName), target: "_blank", rel: "noopener noreferrer", className: styles.calendarAddBtn, title: "\uB0B4 \uCE98\uB9B0\uB354\uC5D0 \uCD94\uAC00", children: _jsx(CalendarPlus, { size: 15 }) }))] }), canEdit && (_jsxs("div", { className: styles.kebabWrapper, children: [_jsx("button", { type: "button", className: styles.kebabBtn, onClick: e => { e.stopPropagation(); setMenuOpen(prev => !prev); }, "aria-label": "\uB354\uBCF4\uAE30", children: "\u22EE" }), menuOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.menuOverlay, onClick: () => setMenuOpen(false) }), _jsxs("div", { className: styles.menu, children: [_jsx("button", { type: "button", onClick: () => { setMenuOpen(false); onEdit?.(); }, children: "\uD3B8\uC9D1" }), _jsx("button", { type: "button", className: styles.deleteMenuItem, onClick: () => { setMenuOpen(false); onDelete?.(); }, children: "\uC0AD\uC81C" })] })] }))] }))] }));
}
