import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
dayjs.locale('ko');
import styles from './TimeSlotPicker.module.scss';
export function TimeSlotPicker({ slots, selected, onSelect }) {
    const grouped = slots.reduce((acc, slot) => {
        acc[slot.date] = [...(acc[slot.date] ?? []), slot];
        return acc;
    }, {});
    return (_jsxs("div", { className: styles.picker, children: [Object.entries(grouped).map(([date, daySlots]) => (_jsxs("div", { className: styles.dayGroup, children: [_jsx("p", { className: styles.date, children: dayjs(date).format('M월 D일 (ddd)') }), _jsx("div", { className: styles.slots, children: daySlots.map(slot => (_jsx("button", { className: clsx(styles.slot, !slot.isAvailable && styles.disabled, selected?.date === slot.date && selected?.startTime === slot.startTime && styles.selected), disabled: !slot.isAvailable, onClick: () => onSelect(slot), children: slot.startTime }, `${slot.date}-${slot.startTime}`))) })] }, date))), slots.length === 0 && _jsx("p", { className: styles.empty, children: "\uAC00\uB2A5\uD55C \uC2AC\uB86F\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })] }));
}
