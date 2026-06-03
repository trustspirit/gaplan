import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { authUserAtom } from '@/store/authAtom';
import { useTasks } from '@/hooks/useTasks';
import { useAvailability } from '@/hooks/useAvailability';
import { useSchedules } from '@/hooks/useSchedules';
import { useIsMobile } from '@/hooks/useIsMobile';
import { computeAvailableSlots } from '@/services/availabilityService';
import { confirmSchedule } from '@/services/scheduleService';
import { AppShell, TopBar } from '@/components/layout';
import { Card, CardHeader, CardBody, Button, Modal, BottomSheet } from '@/components/ui';
import { TaskCard, TimeSlotPicker } from '@/components/domain';
import styles from './TasksPage.module.scss';
export function TasksPage() {
    const user = useAtomValue(authUserAtom);
    const { tasks } = useTasks(user.uid);
    const [activeTask, setActiveTask] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const isMobile = useIsMobile();
    const { schedules } = useSchedules({ presidentUid: user.uid });
    const seventyUid = activeTask?.seventyUid ?? '';
    const { slots } = useAvailability(seventyUid);
    const confirmedDates = schedules.filter(s => s.status === 'confirmed').map(s => s.date);
    const availableSlots = computeAvailableSlots(slots, confirmedDates, dayjs().format('YYYY-MM-DD'), dayjs().add(60, 'day').format('YYYY-MM-DD'));
    const handleConfirm = async () => {
        if (!activeTask || !selectedSlot || !user.unitId)
            return;
        setSubmitting(true);
        try {
            const result = await confirmSchedule({
                taskId: activeTask.id,
                seventyUid,
                unitId: user.unitId,
                slot: selectedSlot,
                type: activeTask.type === 'select_visit' ? 'ward_visit' : 'interview',
            });
            if (result.success) {
                toast.success('일정이 확정되었습니다!');
                setActiveTask(null);
                setSelectedSlot(null);
            }
            else {
                toast.error(result.error ?? '해당 슬롯이 이미 선택되었습니다. 다른 시간을 선택해주세요.');
            }
        }
        catch {
            toast.error('오류가 발생했습니다. 다시 시도해주세요.');
        }
        finally {
            setSubmitting(false);
        }
    };
    const slotPickerContent = (_jsxs(_Fragment, { children: [_jsx(TimeSlotPicker, { slots: availableSlots, selected: selectedSlot, onSelect: setSelectedSlot }), _jsx(Button, { onClick: handleConfirm, loading: submitting, disabled: !selectedSlot, fullWidth: true, className: styles.confirmBtn, children: "\uC77C\uC815 \uD655\uC815" })] }));
    return (_jsxs(AppShell, { role: user.role, name: user.name, topBar: _jsx(TopBar, { name: user.name, pendingCount: tasks.length }), children: [_jsx("div", { className: styles.page, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "\uCC98\uB9AC \uD544\uC694 Task" }), _jsx(CardBody, { children: tasks.length === 0
                                ? _jsx("p", { className: styles.empty, children: "\uBAA8\uB4E0 task\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4." })
                                : tasks.map(t => _jsx(TaskCard, { task: t, onAction: setActiveTask }, t.id)) })] }) }), isMobile ? (_jsx(BottomSheet, { open: !!activeTask, onClose: () => setActiveTask(null), title: "\uB0A0\uC9DC/\uC2DC\uAC04 \uC120\uD0DD", children: slotPickerContent })) : (_jsx(Modal, { open: !!activeTask, onClose: () => setActiveTask(null), title: "\uB0A0\uC9DC/\uC2DC\uAC04 \uC120\uD0DD", children: slotPickerContent }))] }));
}
