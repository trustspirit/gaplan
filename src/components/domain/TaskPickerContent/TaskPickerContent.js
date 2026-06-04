import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TaskPickerContent — shared between DashboardPage and TasksPage.
 *
 * Renders the appropriate UI for a given active task:
 *  - select_visit     → WardAssigner (assign wards to available Sundays)
 *  - select_interview → TimeSlotPicker (multi-select available time slots)
 */
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Button } from '@/components/ui';
import { TimeSlotPicker, WardAssigner } from '@/components/domain';
import { getWardsByUnit } from '@/constants/regions';
import styles from './TaskPickerContent.module.scss';
export function TaskPickerContent({ activeTask, user, availableSlots, isSlotSelected, onToggleSlot, slotSubmitting, selectedSlots, onSubmitAvailability, onSubmitWards, wardSubmitting, }) {
    const { t } = useTranslation();
    const isVisit = activeTask.type === 'select_visit';
    if (isVisit) {
        const wards = getWardsByUnit(user.unitId ?? '');
        return (_jsx(WardAssigner, { availableDates: activeTask.availableDates ?? [], wards: wards, note: activeTask.note, initialAssignments: activeTask.wardAssignments, onSubmit: onSubmitWards, submitting: wardSubmitting }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(TimeSlotPicker, { slots: availableSlots, granularity: "time", multiSelect: true, isSlotSelected: isSlotSelected, onToggle: onToggleSlot }), _jsx(Button, { onClick: onSubmitAvailability, loading: slotSubmitting, disabled: selectedSlots.length === 0, fullWidth: true, className: styles.submitBtn, children: selectedSlots.length > 0
                    ? t('schedule.submitAvailability', { count: selectedSlots.length })
                    : t('schedule.submitAvailabilityEmpty') })] }));
}
/** Returns the picker panel title for a given active task (language-aware). */
export function taskPickerTitle(task) {
    if (!task)
        return '';
    if (task.type === 'select_visit')
        return task.title ?? i18n.t('ward.assignTitle');
    return i18n.t('schedule.selectTimeSlots');
}
