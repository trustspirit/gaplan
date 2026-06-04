import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Button, Input } from '@/components/ui';
import styles from './AvailabilityEditor.module.scss';
export function AvailabilityEditor({ slots, onSave, loading }) {
    const { t } = useTranslation();
    // Use dayjs locale-aware day abbreviations
    const DAYS = Array.from({ length: 7 }, (_, i) => dayjs().day(i).format('ddd'));
    const existingRecurring = slots.filter(s => s.type === 'recurring' && !s.isBlocked);
    const [recurringDays, setRecurringDays] = useState(existingRecurring.flatMap(s => s.recurringDays ?? []));
    const [startTime, setStartTime] = useState(existingRecurring[0]?.startTime ?? '09:00');
    const [endTime, setEndTime] = useState(existingRecurring[0]?.endTime ?? '18:00');
    const toggleDay = (day) => setRecurringDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    const handleSave = () => {
        const newSlots = recurringDays.map(day => ({
            type: 'recurring', recurringDays: [day], startTime, endTime, isBlocked: false,
        }));
        onSave(newSlots);
    };
    return (_jsxs("div", { className: styles.editor, children: [_jsx("p", { className: styles.section, children: t('availability.selectDays') }), _jsx("div", { className: styles.days, children: DAYS.map((d, i) => (_jsx("button", { className: clsx(styles.dayBtn, recurringDays.includes(i) && styles.selected), onClick: () => toggleDay(i), children: d }, i))) }), _jsxs("div", { className: styles.timeRow, children: [_jsx(Input, { label: t('common.startTime'), type: "time", value: startTime, onChange: e => setStartTime(e.target.value) }), _jsx(Input, { label: t('common.endTime'), type: "time", value: endTime, onChange: e => setEndTime(e.target.value) })] }), _jsx(Button, { onClick: handleSave, loading: loading, fullWidth: true, children: t('common.save') })] }));
}
