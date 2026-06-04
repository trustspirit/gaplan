import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import styles from './TimeSlotPicker.module.scss';
export function TimeSlotPicker({ slots, granularity = 'time', selected, onSelect, multiSelect = false, isSlotSelected, onToggle, }) {
    const { t } = useTranslation();
    if (granularity === 'day') {
        const available = slots.filter(s => s.isAvailable);
        return (_jsxs("div", { className: styles.picker, children: [_jsx("div", { className: styles.dayCards, children: available.map(slot => {
                        const d = dayjs(slot.date);
                        const isSelected = multiSelect
                            ? (isSlotSelected?.(slot) ?? false)
                            : selected?.date === slot.date;
                        return (_jsxs("button", { type: "button", className: clsx(styles.dayCard, isSelected && styles.dayCardSelected), onClick: () => multiSelect ? onToggle?.(slot) : onSelect?.(slot), children: [_jsx("span", { className: styles.dayCardDow, children: d.format('ddd') }), _jsx("span", { className: styles.dayCardDate, children: d.format('M/D') })] }, slot.date));
                    }) }), available.length === 0 && (_jsx("p", { className: styles.empty, children: t('schedule.noDates') }))] }));
    }
    // Time-level: grouped by date
    const grouped = slots.reduce((acc, slot) => {
        acc[slot.date] = [...(acc[slot.date] ?? []), slot];
        return acc;
    }, {});
    return (_jsxs("div", { className: styles.picker, children: [Object.entries(grouped).map(([date, daySlots]) => (_jsxs("div", { className: styles.dayGroup, children: [_jsx("p", { className: styles.date, children: dayjs(date).format('M월 D일 (ddd)') }), _jsx("div", { className: styles.slots, children: daySlots.map(slot => {
                            const isSelected = multiSelect
                                ? (isSlotSelected?.(slot) ?? false)
                                : (selected?.date === slot.date && selected?.startTime === slot.startTime);
                            return (_jsx("button", { type: "button", className: clsx(styles.slot, !slot.isAvailable && styles.disabled, isSelected && styles.selected), disabled: !slot.isAvailable, onClick: () => multiSelect ? onToggle?.(slot) : onSelect?.(slot), children: slot.startTime }, `${slot.date}-${slot.startTime}`));
                        }) })] }, date))), slots.length === 0 && _jsx("p", { className: styles.empty, children: t('schedule.noSlots') })] }));
}
