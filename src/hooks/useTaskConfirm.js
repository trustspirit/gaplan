import { useState } from 'react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { useSchedules } from '@/hooks/useSchedules';
import { computeAvailableSlots } from '@/services/availabilityService';
import { confirmSchedule } from '@/services/scheduleService';
import { submitAvailability } from '@/services/taskService';
export function useTaskConfirm(presidentUid, unitId) {
    const [activeTask, setActiveTask] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const { schedules } = useSchedules({ presidentUid });
    const confirmedDates = schedules.filter(s => s.status === 'confirmed').map(s => s.date);
    const taskSlots = activeTask
        ? (activeTask.availableDays ?? []).map(day => ({
            id: '',
            seventyUid: activeTask.seventyUid,
            type: 'recurring',
            recurringDays: [day],
            startTime: activeTask.availableStartTime ?? '09:00',
            endTime: activeTask.availableEndTime ?? '18:00',
            isBlocked: false,
        }))
        : [];
    const availableSlots = computeAvailableSlots(taskSlots, confirmedDates, dayjs().format('YYYY-MM-DD'), dayjs().add(60, 'day').format('YYYY-MM-DD'));
    const isVisit = activeTask?.type === 'select_visit';
    const isMultiSelect = activeTask?.type === 'select_interview' || activeTask?.type === 'select_meeting';
    const openTask = (task) => {
        setActiveTask(task);
        setSelectedSlot(null);
        setSelectedSlots([]);
    };
    const closeTask = () => {
        setActiveTask(null);
        setSelectedSlot(null);
        setSelectedSlots([]);
    };
    const toggleSlot = (slot) => {
        const key = `${slot.date}-${slot.startTime}`;
        setSelectedSlots(prev => {
            const exists = prev.some(s => `${s.date}-${s.startTime}` === key);
            return exists ? prev.filter(s => `${s.date}-${s.startTime}` !== key) : [...prev, slot];
        });
    };
    const isSlotSelected = (slot) => selectedSlots.some(s => s.date === slot.date && s.startTime === slot.startTime);
    // Ward visit: president picks one day → immediate confirmation
    const handleConfirm = async () => {
        if (!activeTask || !selectedSlot || !unitId)
            return;
        setSubmitting(true);
        try {
            const result = await confirmSchedule({
                taskId: activeTask.id,
                seventyUid: activeTask.seventyUid,
                unitId,
                slot: selectedSlot,
                type: 'ward_visit',
            });
            if (result.success) {
                toast.success('방문 일정이 확정되었습니다!');
                closeTask();
            }
            else {
                toast.error(result.error ?? '해당 날짜가 이미 선택되었습니다. 다른 날짜를 선택해주세요.');
            }
        }
        catch {
            toast.error('오류가 발생했습니다. 다시 시도해주세요.');
        }
        finally {
            setSubmitting(false);
        }
    };
    // Interview/Meeting: president submits multiple available slots → awaits admin/seventy confirmation
    const handleSubmitAvailability = async () => {
        if (!activeTask || selectedSlots.length === 0)
            return;
        setSubmitting(true);
        try {
            const result = await submitAvailability({
                taskId: activeTask.id,
                slots: selectedSlots.map(s => ({ date: s.date, startTime: s.startTime, endTime: s.endTime })),
            });
            if (result.success) {
                toast.success('가능한 시간을 제출했습니다. 담당자가 확정 후 알려드립니다.');
                closeTask();
            }
            else {
                toast.error(result.error ?? '제출에 실패했습니다.');
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
        selectedSlots,
        toggleSlot,
        isSlotSelected,
        submitting,
        slotsLoading: false,
        availableSlots,
        isVisit,
        isMultiSelect,
        openTask,
        closeTask,
        handleConfirm,
        handleSubmitAvailability,
    };
}
