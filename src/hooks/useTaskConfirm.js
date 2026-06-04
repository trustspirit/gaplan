import { useState } from 'react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { useAvailability } from '@/hooks/useAvailability';
import { useSchedules } from '@/hooks/useSchedules';
import { computeAvailableSlots } from '@/services/availabilityService';
import { confirmSchedule } from '@/services/scheduleService';
export function useTaskConfirm(presidentUid, unitId) {
    const [activeTask, setActiveTask] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const seventyUid = activeTask?.seventyUid ?? '';
    const { slots, loading: slotsLoading } = useAvailability(seventyUid);
    const { schedules } = useSchedules({ presidentUid });
    const confirmedDates = schedules.filter(s => s.status === 'confirmed').map(s => s.date);
    const availableSlots = computeAvailableSlots(slots, confirmedDates, dayjs().format('YYYY-MM-DD'), dayjs().add(60, 'day').format('YYYY-MM-DD'));
    const openTask = (task) => {
        setActiveTask(task);
        setSelectedSlot(null);
    };
    const closeTask = () => {
        setActiveTask(null);
        setSelectedSlot(null);
    };
    const handleConfirm = async () => {
        if (!activeTask || !selectedSlot || !unitId)
            return;
        setSubmitting(true);
        try {
            const result = await confirmSchedule({
                taskId: activeTask.id,
                seventyUid,
                unitId,
                slot: selectedSlot,
                type: activeTask.type === 'select_visit' ? 'ward_visit' : 'interview',
            });
            if (result.success) {
                toast.success('일정이 확정되었습니다!');
                closeTask();
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
    return {
        activeTask,
        selectedSlot,
        setSelectedSlot,
        submitting,
        slotsLoading,
        availableSlots,
        openTask,
        closeTask,
        handleConfirm,
    };
}
