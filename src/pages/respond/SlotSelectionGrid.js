import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import dayjs from 'dayjs';
import styles from './SlotSelectionGrid.module.scss';
function slotKey(slot) {
    return `${slot.date}_${slot.startTime}_${slot.endTime}`;
}
export function SlotSelectionGrid({ availableDateSlots, selectedSlots, onToggle }) {
    const selectedKeys = new Set(selectedSlots.map(slotKey));
    return (_jsx("div", { className: styles.container, children: availableDateSlots.map(({ date, timeRanges }) => (_jsxs("div", { className: styles.dateGroup, children: [_jsx("div", { className: styles.dateHeader, children: dayjs(date).format('M월 D일 (ddd)') }), _jsx("div", { className: styles.slotList, children: timeRanges.map(({ startTime, endTime }) => {
                        const slot = { date, startTime, endTime };
                        const isSelected = selectedKeys.has(slotKey(slot));
                        return (_jsxs("button", { type: "button", className: `${styles.slotButton}${isSelected ? ` ${styles.selected}` : ''}`, onClick: () => onToggle(slot), children: [startTime, " \u2013 ", endTime] }, `${startTime}_${endTime}`));
                    }) })] }, date))) }));
}
