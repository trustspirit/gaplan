import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * TaskPickerContent — shared between DashboardPage and TasksPage.
 *
 * Renders the appropriate UI for a given active task:
 *  - select_visit     → WardAssigner (assign wards to available Sundays)
 *  - select_interview → TimeSlotPicker (multi-select available time slots)
 */
import { Button } from '@/components/ui';
import { TimeSlotPicker, WardAssigner } from '@/components/domain';
import { getWardsByUnit } from '@/constants/regions';
import styles from './TaskPickerContent.module.scss';
export function TaskPickerContent({ activeTask, user, availableSlots, isSlotSelected, onToggleSlot, slotSubmitting, selectedSlots, onSubmitAvailability, onSubmitWards, wardSubmitting, }) {
    const isVisit = activeTask.type === 'select_visit';
    if (isVisit) {
        const wards = getWardsByUnit(user.unitId ?? '');
        return (_jsx(WardAssigner, { availableDates: activeTask.availableDates ?? [], wards: wards, note: activeTask.note, initialAssignments: activeTask.wardAssignments, onSubmit: onSubmitWards, submitting: wardSubmitting }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(TimeSlotPicker, { slots: availableSlots, granularity: "time", multiSelect: true, isSlotSelected: isSlotSelected, onToggle: onToggleSlot }), _jsxs(Button, { onClick: onSubmitAvailability, loading: slotSubmitting, disabled: selectedSlots.length === 0, fullWidth: true, className: styles.submitBtn, children: ["\uAC00\uB2A5 \uC2DC\uAC04 \uC81C\uCD9C ", selectedSlots.length > 0 ? `(${selectedSlots.length}개)` : ''] })] }));
}
export function taskPickerTitle(task) {
    if (!task)
        return '';
    if (task.type === 'select_visit')
        return task.title ?? '와드/지부 방문 날짜 배정';
    return '가능한 시간 선택 (복수 가능)';
}
