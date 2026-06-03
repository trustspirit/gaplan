import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import clsx from 'clsx';
import { Button, Input } from '@/components/ui';
import styles from './AvailabilityEditor.module.scss';
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function AvailabilityEditor({ slots, onSave, loading }) {
    const [recurringDays, setRecurringDays] = useState(slots.filter(s => s.type === 'recurring' && !s.isBlocked).flatMap(s => s.recurringDays ?? []));
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('18:00');
    const toggleDay = (day) => setRecurringDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    const handleSave = () => {
        const newSlots = recurringDays.map(day => ({
            type: 'recurring', recurringDays: [day], startTime, endTime, isBlocked: false,
        }));
        onSave(newSlots);
    };
    return (_jsxs("div", { className: styles.editor, children: [_jsx("p", { className: styles.section, children: "\uAC00\uB2A5 \uC694\uC77C \uC120\uD0DD" }), _jsx("div", { className: styles.days, children: DAYS.map((d, i) => (_jsx("button", { className: clsx(styles.dayBtn, recurringDays.includes(i) && styles.selected), onClick: () => toggleDay(i), children: d }, i))) }), _jsxs("div", { className: styles.timeRow, children: [_jsx(Input, { label: "\uC2DC\uC791 \uC2DC\uAC04", type: "time", value: startTime, onChange: e => setStartTime(e.target.value) }), _jsx(Input, { label: "\uC885\uB8CC \uC2DC\uAC04", type: "time", value: endTime, onChange: e => setEndTime(e.target.value) })] }), _jsx(Button, { onClick: handleSave, loading: loading, fullWidth: true, children: "\uC800\uC7A5" })] }));
}
